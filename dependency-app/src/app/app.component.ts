import { Component, ElementRef, ViewChild } from '@angular/core';
import { allDependencies, Dependency, DependencyMatroid, depMatroids } from './dependency-matroid';
import DirectedGraph from 'graphology';
import Sigma from 'sigma';
import { SearchService } from './search.service';
import { bfs, getDependentMap, rank as rankFn } from './graph-functions';
import { allRemove, allRootProvide } from './manual-search-results';

const TREE_LEVEL_DISTANCE = 100;
const ADJACENT_NODE_DISTANCE = 50;

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    providers: [SearchService],
    standalone: false,
})
export class AppComponent {
    @ViewChild('canvas', { static: false })
    canvas: ElementRef<HTMLElement> | undefined;
    canvasWidth = 1200;
    canvasHeight = 1400;

    title = 'dependency-app';
    currentMatroid: DependencyMatroid;
    context: CanvasRenderingContext2D | undefined | null;
    searchText = '';
    nodeLabelList: string[] = [];
    isModeChosen = false;

    private matroids = depMatroids;
    private currentGraphIndex = 0;
    private addedNodes: Record<string, boolean> = {};
    private graph: DirectedGraph | undefined;
    private renderer: Sigma | undefined;
    private dependentMap: Record<string, string[]> | undefined;
    private dependenciesOfBigConnectors: string[] = [];

    private removedItems: string[] = [];
    private graphDeps: Dependency[][];

    private recordPosition: boolean;

    ngAfterViewInit(): void {
        // this.context = this.canvas?.nativeElement.getContext('2d');
        // this.context!.font = '12px sans-serif';
    }

    constructor(private searchService: SearchService) {
        this.currentMatroid = this.matroids[0];
        this.graphDeps = [];
        this.recordPosition = false;
    }

    loadManual() {
        this.recordPosition = true;
        this.graphDeps = this.getGraphDepsManualExploration();
        this.isModeChosen = true;
        this.nextGraph();
    }

    loadAutomatic() {
        this.graphDeps = this.getGraphDepsAutoLazyTreeFinder();
        this.isModeChosen = true;
        this.nextGraph();
    }

    nextGraph() {
        this.renderer?.getGraph().clear();
        this.renderer?.kill();
        this.addedNodes = {};

        this.graph = new DirectedGraph();
        const currentGraphDeps = this.graphDeps[this.currentGraphIndex];

        // NODES
        let treendex = 0;
        let nodeRank = rankFn(currentGraphDeps[0].selector, currentGraphDeps);
        for (let { selector, dependents } of currentGraphDeps) {
            if (this.addedNodes[selector]) {
                continue;
            }

            const nextNodeRanks = rankFn(selector, currentGraphDeps);
            if (!dependents.length && !this.recordPosition) {
                nodeRank = 500;
                this.addNodeTree(selector, 0, {
                    size: Math.max(3, Math.min(nextNodeRanks, 15)),
                    isSink: !!dependents.length,
                    isSource: nextNodeRanks - dependents.length > 0,
                });
                continue;
            }

            if (nodeRank - nextNodeRanks >= 1) {
                treendex++;
                nodeRank = nextNodeRanks;
            }

            this.addNodeTree(selector, treendex, {
                size: Math.max(3, Math.min(nextNodeRanks, 15)), // shouldn't be too big or waaay to small
                isSink: !!dependents.length,
                isSource: nextNodeRanks - dependents.length > 0,
            });
        }

        // EDGES
        for (let { selector, dependents } of currentGraphDeps) {
            this.connectNodes(selector, dependents);
        }

        this.renderer = new Sigma(this.graph!, this.canvas!.nativeElement);
        this.deleteNodeOnClick();
        this.enableDrag();
        this.searchService.setGraph(this.graph);
        this.searchService.setRenderer(this.renderer);
        this.searchService.setupHover();
        this.searchService.setClickHighlight();

        this.currentGraphIndex++;
        this.nodeLabelList = this.searchService.getLabelList();
    }

    search(text: string) {
        this.searchService.setSearchQuery(text || '');
    }

    searchTextBlur() {
        this.searchService.setSearchQuery('');
    }

    private deleteNodeOnClick() {
        this.renderer?.on('doubleClickNode', (e) => {
            this.graph?.dropNode(e.node);
            // Prevent sigma to move camera:
            e.event.preventSigmaDefault();
            e.event.original.preventDefault();
            e.event.original.stopPropagation();
            delete this.addedNodes[e.node];
            console.log(this.addedNodes);
            this.removedItems.push(e.node);
            console.log(this.removedItems);
        });
    }

    private enableDrag() {
        // Disable the autoscale at the first down interaction
        this.renderer!.getMouseCaptor().on('mousedown', () => {
            if (!this.renderer!.getCustomBBox()) this.renderer!.setCustomBBox(this.renderer!.getBBox());
        });
        // State for drag'n'drop
        let draggedNode: string | null = null;
        let isDragging = false;

        // On mouse down on a node
        //  - we enable the drag mode
        //  - save in the dragged node in the state
        //  - highlight the node
        //  - disable the camera so its state is not updated
        this.renderer!.on('downNode', (e) => {
            isDragging = true;
            draggedNode = e.node;
            this.graph!.setNodeAttribute(draggedNode, 'highlighted', true);
        });

        // On mouse move, if the drag mode is enabled, we change the position of the draggedNode
        this.renderer!.getMouseCaptor().on('mousemovebody', (e) => {
            if (!isDragging || !draggedNode) return;

            // Get new position of node
            const pos = this.renderer!.viewportToGraph(e);

            this.graph!.setNodeAttribute(draggedNode, 'x', pos.x);
            this.graph!.setNodeAttribute(draggedNode, 'y', pos.y);

            if (this.recordPosition) {
                localStorage.setItem(draggedNode, JSON.stringify(pos));
            }

            // Prevent sigma to move camera:
            e.preventSigmaDefault();
            e.original.preventDefault();
            e.original.stopPropagation();
        });

        // On mouse up, we reset the autoscale and the dragging mode
        this.renderer!.getMouseCaptor().on('mouseup', () => {
            if (draggedNode) {
                this.graph!.removeNodeAttribute(draggedNode, 'highlighted');
            }
            isDragging = false;
            draggedNode = null;
        });
    }

    private getGraphDepsAutoLazyTreeFinder(): Dependency[][] {
        this.dependentMap = getDependentMap(this.currentMatroid.ground);
        this.dependenciesOfBigConnectors = [];
        this.currentGraphIndex = 0;

        const isSource = (d: Dependency) => d.dependents.length === 0;
        const isBigConnector = (d: Dependency) => {
            if (isSource(d)) {
                return false;
            }
            const rank = rankFn(d.selector, this.currentMatroid.ground);
            if (rank === d.dependents.length) {
                return false;
            }
            return rank >= 8;
        };

        const sources = this.currentMatroid.ground.filter(isSource);
        const smolConnectors = this.currentMatroid.ground.filter((d) => {
            // source
            if (isSource(d)) {
                return false;
            }
            const rank = rankFn(d.selector, this.currentMatroid.ground);
            // sink
            if (rank === d.dependents.length) {
                return false;
            }
            // smol connector
            if (rank < 8) {
                return true;
            }
            // big connector, tread with care
            const dependencies = this.currentMatroid.ground.filter((d2) =>
                this.dependentMap?.[d2.selector]?.includes(d.selector)
            );
            for (let dependency of dependencies) {
                if (!isBigConnector(dependency) && !this.dependenciesOfBigConnectors.includes(dependency.selector)) {
                    this.dependenciesOfBigConnectors.push(dependency.selector);
                }
            }
            return false;
        });

        // sinks can be freely removed as they depend on no others that might get lazyloaded
        const smolSinks = this.currentMatroid.ground.filter((d) => {
            const rank = rankFn(d.selector, this.currentMatroid.ground);
            return rank === d.dependents.length && rank < 4;
        });

        const all = [...sources, ...smolConnectors, ...smolSinks];
        const nodesAdded: any = {};
        const graphDepsOfSourcesRet = [];

        // build trees starting from sources with BFS (regarding graph as undirected)
        for (let root of sources) {
            (() => {
                if (nodesAdded[root.selector]) {
                    return;
                }
                nodesAdded[root.selector] = true;
                const treeNodes = bfs(root, all);
                const graphDeps = [];
                for (let treeNode of treeNodes) {
                    // exclude trees with nodes in dependenciesOfBigConnectors
                    if (this.dependenciesOfBigConnectors.includes(treeNode.selector)) {
                        return;
                    }
                    nodesAdded[treeNode.selector] = true;
                    graphDeps.push(treeNode);
                }
                graphDeps.sort((d1, d2) => rankFn(d2.selector, all) - rankFn(d1.selector, all)).unshift(root);
                graphDepsOfSourcesRet.push(graphDeps);
            })();
        }

        const deletedNodes = this.currentMatroid.ground.filter((d) => !all.includes(d));
        console.log('deleted nodes ', deletedNodes);

        graphDepsOfSourcesRet.sort((dos1, dos2) => dos2.length - dos1.length);
        console.log('lazy trees ', graphDepsOfSourcesRet);
        return [...graphDepsOfSourcesRet];
    }

    private getGraphDepsManualExploration() {
        // filter out removed nodes completely, new matroid needed without those nodes
        const filteredAllDependencies: Dependency[] = [];
        for (let dep of allDependencies) {
            if (allRemove.includes(dep.selector)) {
                continue;
            }
            const filteredDependents = dep.dependents.filter((d) => !allRemove.includes(d));
            filteredAllDependencies.push({ selector: dep.selector, dependents: filteredDependents });
        }
        const matroid = new DependencyMatroid(filteredAllDependencies);

        this.dependentMap = getDependentMap(matroid.ground);
        this.dependenciesOfBigConnectors = [];
        this.currentGraphIndex = 0;
        for (let d of allRootProvide) {
            const dependencies = matroid.ground.filter((d2) => this.dependentMap?.[d2.selector]?.includes(d));
            for (let dependency of dependencies) {
                if (!this.dependenciesOfBigConnectors.includes(dependency.selector)) {
                    this.dependenciesOfBigConnectors.push(dependency.selector);
                }
            }
        }
        return [
            matroid.ground.sort((d1, d2) => rankFn(d2.selector, matroid.ground) - rankFn(d1.selector, matroid.ground)),
        ];
    }

    private addNodeTree(
        node: string,
        treendex: number,
        options: { size?: number; isSink?: boolean; isSource?: boolean }
    ) {
        this.addedNodes[node] = true;

        const { size, isSink, isSource } = options;
        let color = 'yellow';
        if (isSource) {
            color = 'red';
            if (isSink) {
                color = 'green';
            }
        } else if (isSink) {
            color = 'blue';
        }

        if (this.dependenciesOfBigConnectors.includes(node)) {
            color = 'purple';
        }

        let savedCoordinates;
        if (this.recordPosition) {
            savedCoordinates = localStorage.getItem(node);
        }
        let x, y;
        if (!savedCoordinates) {
            const nodesOnTreeLevel =
                this.graph?.filterNodes((_, attr) => attr.y === treendex * TREE_LEVEL_DISTANCE).length ?? 0;
            y = treendex * TREE_LEVEL_DISTANCE;
            // 0 -x x -2x 2x .....
            x = ((nodesOnTreeLevel % 2 === 0 ? 1 : -1) * Math.ceil(nodesOnTreeLevel / 2) * ADJACENT_NODE_DISTANCE) / 2;
        } else {
            x = JSON.parse(savedCoordinates).x;
            y = JSON.parse(savedCoordinates).y;
        }

        this.graph?.addNode(node, {
            x,
            y,
            size: size || 1,
            label: node,
            color,
        });
    }

    private connectNodes(selector: string, dependents: string[]) {
        for (let dependent of dependents) {
            if (!this.addedNodes[dependent] || !this.addedNodes[selector]) {
                continue;
            }
            this.graph?.addEdge(dependent, selector, {
                type: 'arrow',
                size: 1,
            });
        }
    }
}
