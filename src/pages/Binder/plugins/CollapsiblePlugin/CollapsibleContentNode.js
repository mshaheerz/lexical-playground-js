/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { ElementNode } from "lexical"
import { IS_CHROME } from "../../shared/src/environment"
import invariant from "../../shared/src/invariant"

import { $isCollapsibleContainerNode } from "./CollapsibleContainerNode"
import { domOnBeforeMatch, setDomHiddenUntilFound } from "./CollapsibleUtils"

export function $convertCollapsibleContentElement(domNode) {
  const node = $createCollapsibleContentNode()
  return {
    node
  }
}

export class CollapsibleContentNode extends ElementNode {
  static getType() {
    return "collapsible-content"
  }

  static clone(node) {
    return new CollapsibleContentNode(node.__key)
  }

  createDOM(config, editor) {
    const dom = document.createElement("div")
    dom.classList.add("Collapsible__content")
    if (IS_CHROME) {
      editor.getEditorState().read(() => {
        const containerNode = this.getParentOrThrow()
        invariant(
          $isCollapsibleContainerNode(containerNode),
          "Expected parent node to be a CollapsibleContainerNode"
        )
        if (!containerNode.__open) {
          setDomHiddenUntilFound(dom)
        }
      })
      domOnBeforeMatch(dom, () => {
        editor.update(() => {
          const containerNode = this.getParentOrThrow().getLatest()
          invariant(
            $isCollapsibleContainerNode(containerNode),
            "Expected parent node to be a CollapsibleContainerNode"
          )
          if (!containerNode.__open) {
            containerNode.toggleOpen()
          }
        })
      })
    }
    return dom
  }

  updateDOM(prevNode, dom) {
    return false
  }

  static importDOM() {
    return {
      div: domNode => {
        if (!domNode.hasAttribute("data-lexical-collapsible-content")) {
          return null
        }
        return {
          conversion: $convertCollapsibleContentElement,
          priority: 2
        }
      }
    }
  }

  exportDOM() {
    const element = document.createElement("div")
    element.classList.add("Collapsible__content")
    element.setAttribute("data-lexical-collapsible-content", "true")
    return { element }
  }

  static importJSON(serializedNode) {
    return $createCollapsibleContentNode()
  }

  isShadowRoot() {
    return true
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: "collapsible-content",
      version: 1
    }
  }
}

export function $createCollapsibleContentNode() {
  return new CollapsibleContentNode()
}

export function $isCollapsibleContentNode(node) {
  return node instanceof CollapsibleContentNode
}
