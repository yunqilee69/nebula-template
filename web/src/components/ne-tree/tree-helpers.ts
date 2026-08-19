import type { CSSProperties } from 'react';
import type { NeTreeNode } from './types';

export function collectExpandableKeys(nodes: NeTreeNode[]): string[] {
  return nodes.flatMap((node) => {
    const childKeys = collectExpandableKeys(node.children ?? []);
    return node.children?.length ? [node.key, ...childKeys] : childKeys;
  });
}

export function filterTree(nodes: NeTreeNode[], keyword: string): NeTreeNode[] {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return nodes;

  return nodes.flatMap((node) => {
    const children = filterTree(node.children ?? [], normalizedKeyword);
    const searchableText = node.searchText ?? node.title;
    const matched = searchableText.toLowerCase().includes(normalizedKeyword);

    if (!matched && children.length === 0) return [];
    return [{ ...node, children }];
  });
}

export function createIndentStyle(level: number, indentSize: number): CSSProperties {
  return { paddingInlineStart: level * indentSize };
}
