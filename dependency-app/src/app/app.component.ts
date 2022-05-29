import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DependencyMatroid, depMatroids } from './dependency-matroid';
import DirectedGraph from 'graphology';
import Sigma from 'sigma';
import { findBase } from 'matroidjs';

type Position = { x: number; y: number };
const CLUSTER_DISTANCE = 900;
const CLUSTER_RADIUS = 500;

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    @ViewChild('canvas', { static: false })
    canvas: ElementRef<HTMLElement> | undefined;
    canvasWidth = 1200;
    canvasHeight = 1400;

    title = 'dependency-app';
    currentMatroid: DependencyMatroid;
    context: CanvasRenderingContext2D | undefined | null;

    private matroids = depMatroids;
    private currentMatroidIndex = 0;
    private addedNodes: Record<string, boolean> = {};
    private graph: DirectedGraph | undefined;
    private renderer: Sigma | undefined;

    ngAfterViewInit(): void {
        // this.context = this.canvas?.nativeElement.getContext('2d');
        // this.context!.font = '12px sans-serif';
    }

    constructor() {
        this.currentMatroid = this.matroids[this.currentMatroidIndex];
    }

    onClick() {
        this.renderer?.getGraph().clear();
        this.renderer?.kill();
        this.addedNodes = {};

        this.graph = new DirectedGraph();
        this.currentMatroid = this.matroids[this.currentMatroidIndex];
        this.currentMatroid.ground.sort(
            (d1, d2) => d1.dependents.length - d2.dependents.length
        );

        const dependenciesMap = this.currentMatroid.ground.reduce(
            (acc, curr) => {
                acc[curr.selector] = curr.dependents;
                return acc;
            },
            {} as Record<string, string[]>
        );

        // NODES
        let treendex = 0;
        const base = this.currentMatroid.ground; // findBase(this.currentMatroid);
        for (let { selector, dependents } of base) {
            if (this.addedNodes[selector]) {
                continue;
            }

            treendex++;
            const queue = [selector];
            let size =
                base.filter(
                    (d) =>
                        dependents.includes(d.selector) ||
                        d.dependents.includes(selector)
                ).length || 1;
            this.addNodeTree(undefined, selector, 0, 1, treendex, size);
            while (queue.length > 0) {
                const rootSelector = queue.shift()!;
                const children = dependenciesMap[rootSelector];
                if (!children?.length) {
                    continue;
                }

                for (let [childI, child] of children.entries()) {
                    if (this.addedNodes[child]) {
                        continue;
                    }
                    size =
                        base.filter(
                            (d) =>
                                dependenciesMap[child]?.includes(d.selector) ||
                                d.dependents.includes(child)
                        ).length || 1;
                    this.addNodeTree(
                        rootSelector,
                        child,
                        childI,
                        children.length,
                        treendex,
                        size
                    );
                    queue.push(child);
                }
            }
        }

        // EDGES
        for (let { selector, dependents } of base) {
            this.connectNodes(selector, dependents);
        }

        this.renderer = new Sigma(this.graph!, this.canvas!.nativeElement);
        this.deleteNodeOnClick();
        this.enableDrag();

        this.currentMatroidIndex++;
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
        });
    }

    private enableDrag() {
        // Disable the autoscale at the first down interaction
        this.renderer!.getMouseCaptor().on('mousedown', () => {
            if (!this.renderer!.getCustomBBox())
                this.renderer!.setCustomBBox(this.renderer!.getBBox());
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

    private addNodesCircular(selectors: string[], clusterOrigo: Position) {
        while (true) {
            if (selectors.length < 1) {
                return;
            }
            const selector = selectors.splice(0, 1)[0];
            if (this.addedNodes[selector]) {
                continue;
            }
            this.addedNodes[selector] = true;
            this.graph?.addNode(selector, {
                x: clusterOrigo.x,
                y: clusterOrigo.y,
                size: 15,
                label: selector,
                color: 'blue',
            });
            break;
        }

        for (let [i, selector] of selectors.entries()) {
            if (this.addedNodes[selector]) {
                continue;
            }
            this.addedNodes[selector] = true;

            const { x, y } = this.getNextPositionOnCircle(
                clusterOrigo,
                i,
                CLUSTER_RADIUS,
                selectors.length
            );

            this.graph?.addNode(selector, {
                x,
                y,
                size: 15,
                label: selector,
                color: 'blue',
            });
        }
    }

    private addNodeTree(
        root: string | undefined,
        child: string,
        index: number,
        children: number,
        treendex: number,
        size: number
    ) {
        this.addedNodes[child] = true;
        let parentPos = { x: treendex * 100, y: 0 };
        if (root) {
            const { x, y } = this.graph?.getNodeAttributes(
                this.graph?.findNode((key) => key === root)
            )!;
            parentPos = { x, y };
        }
        const nextPos = this.getNextPositionOnTree(parentPos, index, children);
        this.graph?.addNode(child, {
            x: nextPos.x,
            y: nextPos.y,
            size,
            label: child,
            color: 'blue',
        });
    }

    private connectNodes(selector: string, dependents: string[]) {
        for (let dependent of dependents) {
            this.graph?.addEdge(dependent, selector, {
                type: 'arrow',
                size: 1,
            });
        }
    }

    private getNextPositionOnCircle(
        origo: Position,
        index: number,
        radius: number,
        numberOfPoints: number
    ): Position {
        const radian = (index * 2 * Math.PI) / numberOfPoints;
        const x = radius * Math.cos(radian) + origo.x;
        const y = radius * Math.sin(radian) + origo.y;
        return { x, y };
    }

    private getNextPositionOnTree(
        parentPos: Position,
        childI: number,
        children: number
    ): Position {
        const y = parentPos.y + 300;
        const x = parentPos.x + (childI * 300 - children * 150);
        return { x, y };
    }
}
