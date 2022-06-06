import { Injectable } from '@angular/core';
import Graph from 'graphology';
import Sigma from 'sigma';
import { Coordinates, EdgeDisplayData, NodeDisplayData } from 'sigma/types';

// Type and declare internal this.state:
interface State {
    hoveredNode?: string;
    searchQuery: string;

    // this.state derived from query:
    selectedNode?: string;
    suggestions?: Set<string>;

    // this.state derived from hovered node:
    hoveredNeighbors?: Set<string>;
}

@Injectable()
export class SearchService {
    state: State = { searchQuery: '' };
    graph: Graph | undefined;
    renderer: Sigma | undefined;

    setGraph(graph: Graph) {
        this.graph = graph;
    }

    setRenderer(renderer: Sigma) {
        this.renderer = renderer;
    }

    getLabelList(): string[] {
        return this.graph!.nodes().map((node) => this.graph!.getNodeAttribute(node, 'label'));
    }

    // Actions:
    setSearchQuery(query: string) {
        this.state.searchQuery = query;

        if (query) {
            const lcQuery = query.toLowerCase();
            const suggestions = this.graph!.nodes()
                .map((n) => ({ id: n, label: this.graph!.getNodeAttribute(n, 'label') as string }))
                .filter(({ label }) => label.toLowerCase().includes(lcQuery));

            // If we have a single perfect match, them we remove the suggestions, and
            // we consider the user has selected a node through the datalist
            // autocomplete:
            if (suggestions.length === 1 && suggestions[0].label === query) {
                this.state.selectedNode = suggestions[0].id;
                this.state.suggestions = undefined;

                // Move the camera to center it on the selected node:
                const nodePosition = this.renderer!.getNodeDisplayData(this.state.selectedNode) as Coordinates;
                this.renderer!.getCamera().animate(nodePosition, {
                    duration: 500,
                });
            }
            // Else, we display the suggestions list:
            else {
                this.state.selectedNode = undefined;
                this.state.suggestions = new Set(suggestions.map(({ id }) => id));
            }
        }
        // If the query is empty, then we reset the selectedNode / suggestions this.state:
        else {
            this.state.selectedNode = undefined;
            this.state.suggestions = undefined;
        }

        // Refresh rendering:
        this.renderer!.refresh();
    }

    setHoveredNode(node: string | undefined) {
        if (node) {
            this.state.hoveredNode = node;
            this.state.hoveredNeighbors = new Set(this.graph!.neighbors(node));
        } else {
            this.state.hoveredNode = undefined;
            this.state.hoveredNeighbors = undefined;
        }

        // Refresh rendering:
        this.renderer!.refresh();
    }

    setupHover() {
        this.renderer!.on('enterNode', ({ node }) => {
            this.setHoveredNode(node);
        });
        this.renderer!.on('leaveNode', () => {
            this.setHoveredNode(undefined);
        });

        // Render nodes accordingly to the internal this.state:
        // 1. If a node is selected, it is highlighted
        // 2. If there is query, all non-matching nodes are greyed
        // 3. If there is a hovered node, all non-neighbor nodes are greyed
        this.renderer!.setSetting('nodeReducer', (node, data) => {
            const res: Partial<NodeDisplayData> = { ...data };

            if (
                this.state.hoveredNeighbors &&
                !this.state.hoveredNeighbors.has(node) &&
                this.state.hoveredNode !== node
            ) {
                res.label = '';
                res.color = '#f6f6f6';
            }

            if (this.state.selectedNode === node) {
                res.highlighted = true;
            } else if (this.state.suggestions && !this.state.suggestions.has(node)) {
                res.label = '';
                res.color = '#f6f6f6';
            }

            return res;
        });

        // Render edges accordingly to the internal this.state:
        // 1. If a node is hovered, the edge is hidden if it is not connected to the
        //    node
        // 2. If there is a query, the edge is only visible if it connects two
        //    suggestions
        this.renderer!.setSetting('edgeReducer', (edge, data) => {
            const res: Partial<EdgeDisplayData> = { ...data };

            if (this.state.hoveredNode && !this.graph!.hasExtremity(edge, this.state.hoveredNode)) {
                res.hidden = true;
            }

            if (
                this.state.suggestions &&
                (!this.state.suggestions.has(this.graph!.source(edge)) ||
                    !this.state.suggestions.has(this.graph!.target(edge)))
            ) {
                res.hidden = true;
            }

            return res;
        });
    }

    // Bind search input interactions:
    //   searchInput.addEventListener("input", () => {
    //     setSearchQuery(searchInput.value || "");
    //   });
    //   searchInput.addEventListener("blur", () => {
    //     setSearchQuery("");
    //   });
}
