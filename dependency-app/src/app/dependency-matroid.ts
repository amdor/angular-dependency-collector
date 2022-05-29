import rawDependencyData from '../assets/dependencies.json'; // generate with python script if does not exist
import { Matroid } from 'matroidjs';

interface Dependency {
    selector: string;
    dependents: string[];
}

type Selector = string;
type DependentsMap = Record<string, boolean>; // for quick searching
type Dependents = string[];
type DependencyMap = Record<Selector, Dependents>;

const dependencies: Dependency[] = Object.keys(rawDependencyData).map(
    (selector) => ({ selector, dependents: rawDependencyData[selector] })
);

const getCycleFinder = (dependenciesToCheck: DependencyMap) => {
    const visitedDeps: DependentsMap = {};
    const recStack: DependentsMap = {};
    const _findCycle = (sink: string, sources: string[]): boolean => {
        if (visitedDeps[sink]) {
            recStack[sink] = false;
            return false;
        }
        visitedDeps[sink] = true;
        recStack[sink] = true;
        for (const source of sources) {
            const sourcesOfSource = dependenciesToCheck[source];
            // check subgraph if hasn't been checked already, and then check if the source has already been
            // visited during that particular recursion (recursionTracker)
            if (
                (!visitedDeps[source] &&
                    sourcesOfSource?.length &&
                    _findCycle(source, sourcesOfSource)) ||
                recStack[source]
            ) {
                return true;
            }
        }
        return false;
    };
    return _findCycle;
};

export class DependencyMatroid extends Matroid<Dependency> {
    hasCircuit(dependenciesToCheck: Dependency[]): boolean {
        // converting back from {selector: string, dependents: string[]} to {[selector]: [dependents]}
        const dependencyMap = dependenciesToCheck.reduce((acc, curr) => {
            acc[curr.selector] = curr.dependents;
            return acc;
        }, {} as DependencyMap);
        const cycleFinder = getCycleFinder(dependencyMap); // using shared visited and recTrack for all iterations
        for (const dependency of dependenciesToCheck) {
            const hasCircuit = cycleFinder(
                dependency.selector,
                dependency.dependents
            );
            if (hasCircuit) {
                return true;
            }
        }
        return false;
    }
}

// consider the connected subgraph as matroid for each component
export const depMatroids = ((): DependencyMatroid[] => {
    const depsPartOfASubGraphAlready: Record<string, boolean> = {};
    return dependencies
        .map((dep) => {
            if (depsPartOfASubGraphAlready[dep.selector]) {
                return undefined;
            }
            depsPartOfASubGraphAlready[dep.selector] = true;
            const visitedDeps: DependentsMap = {};
            const dependencySubGraph: Dependency[] = [];
            const traverse = (dependency: Dependency) => {
                const { selector: sink, dependents: sources } = dependency;
                if (visitedDeps[sink]) {
                    return;
                }
                visitedDeps[sink] = true;
                dependencySubGraph.push(dependency);
                depsPartOfASubGraphAlready[sink] = true;
                // going through all the dependents, and dependencies
                const dependentsAndDeendencies = dependencies.filter(
                    (d) =>
                        sources.includes(d.selector) ||
                        d.dependents.includes(sink)
                );
                for (const adjacent of dependentsAndDeendencies) {
                    traverse(adjacent);
                }
                return;
            };
            traverse(dep);
            return new DependencyMatroid(dependencySubGraph);
        })
        .filter(Boolean)
        .sort(
            (a, b) => (b?.ground.length ?? 0) - (a?.ground.length ?? 0)
        ) as DependencyMatroid[];
})();
