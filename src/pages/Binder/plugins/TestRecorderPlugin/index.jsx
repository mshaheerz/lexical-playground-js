import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  getDOMSelection
} from "lexical"
import * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"

import useLayoutEffect from "../../shared/src/useLayoutEffect"
import { IS_APPLE } from "../../shared/src/environment"

const copy = text => {
  const textArea = document.createElement("textarea")
  textArea.value = text || ""
  textArea.style.position = "absolute"
  textArea.style.opacity = "0"
  document.body?.appendChild(textArea)
  textArea.focus()
  textArea.select()
  try {
    const result = document.execCommand("copy")
    // eslint-disable-next-line no-console
    console.log(result)
  } catch (error) {
    console.error(error)
  }
  document.body?.removeChild(textArea)
}

const download = (filename, text) => {
  const a = document.createElement("a")
  a.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text || "")
  )
  a.setAttribute("download", filename)
  a.style.display = "none"
  document.body?.appendChild(a)
  a.click()
  document.body?.removeChild(a)
}

const formatStep = step => {
  const formatOneStep = (name, value) => {
    switch (name) {
      case "click": {
        return `      await page.mouse.click(${value.x}, ${value.y});`
      }
      case "press": {
        return `      await page.keyboard.press('${value}');`
      }
      case "keydown": {
        return `      await page.keyboard.keydown('${value}');`
      }
      case "keyup": {
        return `      await page.keyboard.keyup('${value}');`
      }
      case "type": {
        return `      await page.keyboard.type('${value}');`
      }
      case "selectAll": {
        return `      await selectAll(page);`
      }
      case "snapshot": {
        return `      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [${value.anchorPath.toString()}],
        anchorOffset: ${value.anchorOffset},
        focusPath: [${value.focusPath.toString()}],
        focusOffset: ${value.focusOffset},
      });
`
      }
      default:
        return ``
    }
  }
  const formattedStep = formatOneStep(step.name, step.value)
  switch (step.count) {
    case 1:
      return formattedStep
    case 2:
      return [formattedStep, formattedStep].join(`\n`)
    default:
      return `      await repeat(${step.count}, async () => {
  ${formattedStep}
      );`
  }
}

export function isSelectAll(event) {
  return (
    event.key.toLowerCase() === "a" &&
    (IS_APPLE ? event.metaKey : event.ctrlKey)
  )
}

// stolen from LexicalSelection-test
function sanitizeSelection(selection) {
  const { anchorNode, focusNode } = selection
  let { anchorOffset, focusOffset } = selection
  if (anchorOffset !== 0) {
    anchorOffset--
  }
  if (focusOffset !== 0) {
    focusOffset--
  }
  return { anchorNode, anchorOffset, focusNode, focusOffset }
}

function getPathFromNodeToEditor(node, rootElement) {
  let currentNode = node
  const path = []
  while (currentNode !== rootElement) {
    if (currentNode !== null && currentNode !== undefined) {
      path.unshift(
        Array.from(currentNode?.parentNode?.childNodes ?? []).indexOf(
          currentNode
        )
      )
    }
    currentNode = currentNode?.parentNode
  }
  return path
}

const keyPresses = new Set([
  "Enter",
  "Backspace",
  "Delete",
  "Escape",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown"
])

function useTestRecorder(editor) {
  const [steps, setSteps] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [, setCurrentInnerHTML] = useState("")
  const [templatedTest, setTemplatedTest] = useState("")
  const previousSelectionRef = useRef(null)
  const skipNextSelectionChangeRef = useRef(false)
  const preRef = useRef(null)

  const getCurrentEditor = useCallback(() => {
    return editor
  }, [editor])

  const generateTestContent = useCallback(() => {
    const rootElement = editor.getRootElement()
    const browserSelection = getDOMSelection(editor._window)

    if (
      rootElement == null ||
      browserSelection == null ||
      browserSelection.anchorNode == null ||
      browserSelection.focusNode == null ||
      !rootElement.contains(browserSelection.anchorNode) ||
      !rootElement.contains(browserSelection.focusNode)
    ) {
      return null
    }

    return `
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  initializeE2E,
  assertHTMLSnapshot,
  assertSelection,
  repeat,
} from '../utils';
import {selectAll} from '../keyboardShortcuts';
import { RangeSelection } from 'lexical';
import { NodeSelection } from 'lexical';

describe('Test case', () => {
  initializeE2E((e2e) => {
    it('Should pass this test', async () => {
      const {page} = e2e;

      await page.focus('div[contenteditable="true"]');
${steps.map(formatStep).join(`\n`)}
    });
});
    `
  }, [editor, steps])

  // just a wrapper around inserting new actions so that we can
  // coalesce some actions like insertText/moveNativeSelection
  const pushStep = useCallback(
    (name, value) => {
      setSteps(currentSteps => {
        // trying to group steps
        const currentIndex = steps.length - 1
        const lastStep = steps[currentIndex]
        if (lastStep) {
          if (lastStep.name === name) {
            if (name === "type") {
              // for typing events we just append the text
              return [
                ...steps.slice(0, currentIndex),
                { ...lastStep, value: lastStep.value + value }
              ]
            } else {
              // for other events we bump the counter if their values are the same
              if (lastStep.value === value) {
                return [
                  ...steps.slice(0, currentIndex),
                  { ...lastStep, count: lastStep.count + 1 }
                ]
              }
            }
          }
        }
        // could not group, just append a new one
        return [...currentSteps, { count: 1, name, value }]
      })
    },
    [steps, setSteps]
  )

  useLayoutEffect(() => {
    const onKeyDown = event => {
      if (!isRecording) {
        return
      }
      const key = event.key
      if (isSelectAll(event)) {
        pushStep("selectAll", "")
      } else if (keyPresses.has(key)) {
        pushStep("press", event.key)
      } else if ([...key].length > 1) {
        pushStep("keydown", event.key)
      } else {
        pushStep("type", event.key)
      }
    }

    const onKeyUp = event => {
      if (!isRecording) {
        return
      }
      const key = event.key
      if (!keyPresses.has(key) && [...key].length > 1) {
        pushStep("keyup", event.key)
      }
    }

    return editor.registerRootListener((rootElement, prevRootElement) => {
      if (prevRootElement !== null) {
        prevRootElement.removeEventListener("keydown", onKeyDown)
        prevRootElement.removeEventListener("keyup", onKeyUp)
      }
      if (rootElement !== null) {
        rootElement.addEventListener("keydown", onKeyDown)
        rootElement.addEventListener("keyup", onKeyUp)
      }
    })
  }, [editor, isRecording, pushStep])

  useLayoutEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTo(0, preRef.current.scrollHeight)
    }
  }, [generateTestContent])

  useEffect(() => {
    if (steps) {
      const testContent = generateTestContent()
      if (testContent !== null) {
        setTemplatedTest(testContent)
      }
      if (preRef.current) {
        preRef.current.scrollTo(0, preRef.current.scrollHeight)
      }
    }
  }, [generateTestContent, steps])

  useEffect(() => {
    const removeUpdateListener = editor.registerUpdateListener(
      ({ editorState, dirtyLeaves, dirtyElements }) => {
        if (!isRecording) {
          return
        }
        const currentSelection = editorState._selection
        const previousSelection = previousSelectionRef.current
        const skipNextSelectionChange = skipNextSelectionChangeRef.current
        if (previousSelection !== currentSelection) {
          if (
            dirtyLeaves.size === 0 &&
            dirtyElements.size === 0 &&
            !skipNextSelectionChange
          ) {
            const browserSelection = getDOMSelection(editor._window)
            if (
              browserSelection &&
              (browserSelection.anchorNode == null ||
                browserSelection.focusNode == null)
            ) {
              return
            }
          }
          previousSelectionRef.current = currentSelection
        }
        skipNextSelectionChangeRef.current = false
        const testContent = generateTestContent()
        if (testContent !== null) {
          setTemplatedTest(testContent)
        }
      }
    )
    return removeUpdateListener
  }, [editor, generateTestContent, isRecording, pushStep])

  // save innerHTML
  useEffect(() => {
    if (!isRecording) {
      return
    }
    const removeUpdateListener = editor.registerUpdateListener(() => {
      const rootElement = editor.getRootElement()
      if (rootElement !== null) {
        setCurrentInnerHTML(rootElement?.innerHTML)
      }
    })
    return removeUpdateListener
  }, [editor, isRecording])

  // clear editor and start recording
  const toggleEditorSelection = useCallback(
    currentEditor => {
      if (!isRecording) {
        currentEditor.update(() => {
          const root = $getRoot()
          root.clear()
          const text = $createTextNode()
          root.append($createParagraphNode().append(text))
          text.select()
        })
        setSteps([])
      }
      setIsRecording(currentIsRecording => !currentIsRecording)
    },
    [isRecording]
  )

  const onSnapshotClick = useCallback(() => {
    if (!isRecording) {
      return
    }
    const browserSelection = getDOMSelection(getCurrentEditor()._window)
    if (
      browserSelection === null ||
      browserSelection.anchorNode == null ||
      browserSelection.focusNode == null
    ) {
      return
    }
    const {
      anchorNode,
      anchorOffset,
      focusNode,
      focusOffset
    } = sanitizeSelection(browserSelection)
    const rootElement = getCurrentEditor().getRootElement()
    let anchorPath
    if (anchorNode !== null) {
      anchorPath = getPathFromNodeToEditor(anchorNode, rootElement)
    }
    let focusPath
    if (focusNode !== null) {
      focusPath = getPathFromNodeToEditor(focusNode, rootElement)
    }
    pushStep("snapshot", {
      anchorNode,
      anchorOffset,
      anchorPath,
      focusNode,
      focusOffset,
      focusPath
    })
  }, [pushStep, isRecording, getCurrentEditor])

  const onCopyClick = useCallback(() => {
    copy(generateTestContent())
  }, [generateTestContent])

  const onDownloadClick = useCallback(() => {
    download("test.js", generateTestContent())
  }, [generateTestContent])

  const button = (
    <button
      id="test-recorder-button"
      className={`editor-dev-button ${isRecording ? "active" : ""}`}
      onClick={() => toggleEditorSelection(getCurrentEditor())}
      title={isRecording ? "Disable test recorder" : "Enable test recorder"}
    />
  )
  const output = isRecording ? (
    <div className="test-recorder-output">
      <div className="test-recorder-toolbar">
        <button
          className="test-recorder-button"
          id="test-recorder-button-snapshot"
          title="Insert snapshot"
          onClick={onSnapshotClick}
        />
        <button
          className="test-recorder-button"
          id="test-recorder-button-copy"
          title="Copy to clipboard"
          onClick={onCopyClick}
        />
        <button
          className="test-recorder-button"
          id="test-recorder-button-download"
          title="Download as a file"
          onClick={onDownloadClick}
        />
      </div>
      <pre id="test-recorder" ref={preRef}>
        {templatedTest}
      </pre>
    </div>
  ) : null

  return [button, output]
}

export default function TestRecorderPlugin() {
  const [editor] = useLexicalComposerContext()
  const [testRecorderButton, testRecorderOutput] = useTestRecorder(editor)

  return (
    <>
      {testRecorderButton}
      {testRecorderOutput}
    </>
  )
}
