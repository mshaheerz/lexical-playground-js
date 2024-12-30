import { TextNode } from "lexical"

import { uuid as UUID } from "../plugins/AutocompletePlugin"

export class AutocompleteNode extends TextNode {
  static clone(node) {
    return new AutocompleteNode(node.__text, node.__uuid, node.__key)
  }

  static getType() {
    return "autocomplete"
  }

  static importJSON(serializedNode) {
    const node = $createAutocompleteNode(
      serializedNode.text,
      serializedNode.uuid
    )
    node.setFormat(serializedNode.format)
    node.setDetail(serializedNode.detail)
    node.setMode(serializedNode.mode)
    node.setStyle(serializedNode.style)
    return node
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: "autocomplete",
      uuid: this.__uuid,
      version: 1
    }
  }

  constructor(text, uuid, key) {
    super(text, key)
    this.__uuid = uuid
  }

  updateDOM(prevNode, dom, config) {
    return false
  }

  exportDOM(_) {
    return { element: null }
  }

  excludeFromCopy() {
    return true
  }

  createDOM(config) {
    const dom = super.createDOM(config)
    dom.classList.add(config.theme.autocomplete)
    if (this.__uuid !== UUID) {
      dom.style.display = "none"
    }
    return dom
  }
}

export function $createAutocompleteNode(text, uuid) {
  return new AutocompleteNode(text, uuid).setMode("token")
}
