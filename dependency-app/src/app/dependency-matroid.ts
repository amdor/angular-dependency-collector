import rawDependencyData from '../assets/dependencies.json'; // generate with python script if does not exist
import { Matroid } from 'matroidjs';

export interface Dependency {
    selector: string;
    dependents: string[];
}

type Selector = string;
type DependentsMap = Record<string, boolean>; // for quick searching
type Dependents = string[];
type DependencyMap = Record<Selector, Dependents>;

const dependencies: Dependency[] = Object.keys(rawDependencyData).map((selector) => ({
    selector,
    dependents: rawDependencyData[selector],
}));

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
                (!visitedDeps[source] && sourcesOfSource?.length && _findCycle(source, sourcesOfSource)) ||
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
            const hasCircuit = cycleFinder(dependency.selector, dependency.dependents);
            if (hasCircuit) {
                return true;
            }
        }
        return false;
    }
}

const allComponents: Record<string, boolean> = {};
export const allDependencies: Dependency[] = [];
for (let dep of dependencies) {
    if (!allComponents[dep.selector]) {
        allComponents[dep.selector] = true;
        // self reference doesn't count as dependency
        allDependencies.push({ ...dep, dependents: dep.dependents.filter((d) => d !== dep.selector) });
    }
    for (let dependent of dep.dependents) {
        if (allComponents[dependent]) {
            continue;
        }
        allComponents[dependent] = true;
        allDependencies.push({
            selector: dependent,
            // self reference doesn't count as dependency
            dependents: rawDependencyData[dependent]?.filter((d: string) => d !== dependent) ?? [],
        });
    }
}
export const depMatroids = [new DependencyMatroid(allDependencies)];
