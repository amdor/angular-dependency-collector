import find_components
import json
from find_dependents import find_dependents, get_selector


def main():
    dependencies = {}
    path = find_components.get_traverse_paths()
    components = find_components.gather_component_files(path)
    for component in components:
        selector = get_selector(component)
        if selector == None:
            print("Selector not found for ", component)
            continue
        print("Evaluating component: " + selector)
        print("Finding dependents")
        dependents = find_dependents(selector, path)
        print("Dependents found: " + str(dependents))
        if len(dependents) > 0:
            dependencies[selector] = list(dependents)

    print(dependencies)
    with open('./dependency-app/src/assets/dependencies.json', 'w') as depencencied_file:
        json.dump(dependencies, depencencied_file)


if __name__ == "__main__":
    main()
