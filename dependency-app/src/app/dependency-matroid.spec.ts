import { DependencyMatroid } from "./dependency-matroid";


describe("DependencyMatroid", () => {
    const V1 = { selector: "a", dependents: ["b"] };
    const V2 = { selector: "b", dependents: ["c"] };
    const V3 = { selector: "c", dependents: ["a"] };
    let matroid: DependencyMatroid;

    beforeEach(() => {
        matroid = new DependencyMatroid([V1, V2, V3]);
    });

    it("should have a circuit", () => {
        expect(matroid.hasCircuit(matroid.ground));
    });

    it("should have a circuit with only 2 items", () => {
        expect(matroid.hasCircuit([V2, V1]));
    });

});
