/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $insertNodeToNearestRoot } from "@lexical/utils"
import { COMMAND_PRIORITY_EDITOR, createCommand } from "lexical"
import { useEffect } from "react"

import { $createTweetNode, TweetNode } from "../../nodes/TweetNode"

export const INSERT_TWEET_COMMAND = createCommand("INSERT_TWEET_COMMAND")

export default function TwitterPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!editor.hasNodes([TweetNode])) {
      throw new Error("TwitterPlugin: TweetNode not registered on editor")
    }

    return editor.registerCommand(
      INSERT_TWEET_COMMAND,
      payload => {
        const tweetNode = $createTweetNode(payload)
        $insertNodeToNearestRoot(tweetNode)

        return true
      },
      COMMAND_PRIORITY_EDITOR
    )
  }, [editor])

  return null
}
