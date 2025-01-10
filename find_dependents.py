import os
from find_components import gather_component_files
from indexer import gather_files

from utils import search_for_regex


def find_component_for_template(template_file_path):
    """
    Find the component for the file containing the template
    :param template_file_path: the name of the file containing the template string (full path name)
    :return: the selector of the componen referencing the template
    """
    template_file_name = os.path.basename(template_file_path)
    # suspected template is in the component file
    if('.ts' in template_file_path):
        with open(template_file_path, mode='rt') as template_component_candidate:
            component_text = ''.join(template_component_candidate.readlines())
        if template_file_name in component_text:
            return get_selector_from_text(component_text)

    # find component file containing the tamplate reference
    components = gather_component_files(os.path.dirname(template_file_path))
    for component in components:
        with open(component, mode='rt') as template_component_candidate:
            component_text = ''.join(template_component_candidate.readlines())
        if template_file_name in component_text:
            print("Get selector from text in file: " + template_file_name)
            return get_selector_from_text(component_text)
    print("Selector not found for ", template_file_name)
    return None


def find_dependents(selector, root):
    """
    Traverses through all subdirectories of root searching for given selector in component and template files
    :param selector: searched selector
    :param root: the basepoint of search
    :rtype: set
    :return: all found filenames
    """
    dependents = set()

    potentially_dependent_files = gather_files(
        root, "\.((container|component)\.ts)|(\.html)$")
    for potentially_dependent_file_path in potentially_dependent_files:
        potentially_dependent_file_text = ''
        with open(potentially_dependent_file_path, mode='rt') as potentially_dependent_file:
            potentially_dependent_file_text = ''.join(
                potentially_dependent_file.readlines())
        if "<"+selector in potentially_dependent_file_text:
            child_selector = find_component_for_template(
                potentially_dependent_file_path)
            dependents.add(os.path.basename(potentially_dependent_file_path) if child_selector ==
                           None else child_selector)
    return dependents


def get_selector_from_text(component_file_text):
    try:
        selector_search_result = search_for_regex(
            """(?:(@Component|@Directive)\s*\(\s*\{[\s|\S]*selector:\s*(\"|\'))(?P<selector>(.)*)(\"|\')""", component_file_text)
        if selector_search_result:
            return selector_search_result.group("selector")
    except:
        return None
    return None


def get_selector(file_name):
    print("Get selector for: " + file_name)
    with open(file_name, mode='rt') as component_file:
        component_file_content = component_file.readlines()
        component_file_text = ''.join(component_file_content)
    return get_selector_from_text(component_file_text)


def main():
    selector = get_selector("./trial.container.ts")
    print("selector found: " + selector)
    find_dependents(selector, os.path.dirname(os.path.realpath(__file__)))


if __name__ == "__main__":
    main()
