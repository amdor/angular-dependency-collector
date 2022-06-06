import { Dependency } from './dependency-matroid';

export const getDependentMap = (graph: Dependency[]) =>
    graph.reduce((acc, curr) => {
        acc[curr.selector] = curr.dependents;
        return acc;
    }, {} as Record<string, string[]>);

export const bfs = (startNode: Dependency, graph: Dependency[]): Dependency[] => {
    const dependentMap = getDependentMap(graph);
    const queue: Dependency[] = [];
    const visited: any = {};

    let currentNode = startNode;
    visited[currentNode.selector] = currentNode;
    queue.push(currentNode);

    while (queue.length) {
        // Dequeue a vertex from queue and print it
        currentNode = queue.pop()!;

        // Get all adjacent vertices of the dequeued vertex s
        // If a adjacent has not been visited, then mark it
        // visited and enqueue it
        const adjacents = graph.filter(
            (d) => dependentMap[currentNode.selector]?.includes(d.selector) || d.dependents.includes(currentNode.selector)
        );
        for (let adjacent of adjacents) {
            if (!visited[adjacent.selector]) {
                visited[adjacent.selector] = adjacent;
                queue.push(adjacent);
            }
        }
    }
    return Object.values(visited);
};

export const rank = (node: string, graph: Dependency[]): number => {
    const regardedDepencenciesMap = getDependentMap(graph);
    return (
        graph.filter((d) => regardedDepencenciesMap[node]?.includes(d.selector) || d.dependents.includes(node))
            .length || 1
    );
};
