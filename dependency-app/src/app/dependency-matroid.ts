import rawDependencyData from '../assets/dependencies.json'; // generate with python script if does not exist
import { Matroid } from 'matroidjs';

interface Dependency {
  selector: string;
  dependents: string[];
}

const dependencies: Dependency[] = Object.keys(rawDependencyData).map(
  (selector) => ({ selector, dependents: rawDependencyData[selector] })
);

export class DependencyMatroid extends Matroid<Dependency> {
  hasCircuit(dependenciesToCheck: Dependency[]): boolean {
    const dependencyMap = dependenciesToCheck.reduce((acc, curr) => {
      const deps: Record<string, boolean> = {};
      for (let dependent of curr.dependents) {
        deps[dependent] = true;
      }
      acc[curr.selector] = deps;
      return acc;
    }, {} as Record<string, Record<string, boolean>>);
    for (let dependency of dependenciesToCheck) {
      for (let dependent of dependency.dependents) {
        if (dependencyMap[dependent]?.[dependent]) {
          return true;
        }
      }
    }
    return false;
  }
}

export const depMatroid = new DependencyMatroid(dependencies);
