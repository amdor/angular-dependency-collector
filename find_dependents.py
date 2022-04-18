import os
from find_components import gather_component_files

from utils import extract_result, search_for_regex

def find_component_for_template(template_file_path):
    """
    Find the component for the file containing the template
    :param template_file_path: the name of the file containing the template string (full path name)
    :return: the selector of the componen referencing the template
    """
    template_file_name = os.path.basename(template_file_path)
    # suspected template is in the component file
    if('.ts' in template_file_path):
        with open(template_file_path, 'rt') as template_component_candidate:
            component_text = ''.join(template_component_candidate.readlines())
            if template_file_name in component_text:
                return get_selector_from_text(component_text)

    # find component file containing the tamplate reference
    components = gather_component_files(os.path.dirname(template_file_path))
    for component in components:
        with open(component, 'rt') as template_component_candidate:
            component_text = ''.join(template_component_candidate.readlines())
            if template_file_name in component_text:
                return get_selector_from_text(component_text)

def find_dependents(selector, root):
    """
    Traverses through all subdirectories of root searching for given selector in component and template files
    :param selector: searched selector
    :param root: the basepoint of search
    :rtype: set
    :return: all found filenames
    """
    dependents = set()
    for child in os.listdir(root):
        abs_path = os.path.join(root, child)
        if (os.path.isdir(abs_path) and ".git" not in abs_path and "node_modules" not in abs_path and "dir/" not in abs_path):
            dependents |= find_dependents(selector, abs_path)
        elif extract_result(search_for_regex("\.((container|component)\.ts)|(\.html)$", child)):
            with open(abs_path, 'rt') as template_component_candidate:
                dependent_file_candidate_text = ''.join(template_component_candidate.readlines())
                if "<"+selector in dependent_file_candidate_text:
                    child_selector = find_component_for_template(abs_path)
                    dependents.add(child if child_selector == None else child_selector)
                    # print("Dependent found: " + child + " for " + selector)
    return dependents

def get_selector_from_text(component_file_text):
    selector_search_result = search_for_regex( """(?:@Component\s*\(\s*\{((\s|.)(?!selector))*\s*selector:\s*("|'))(?P<selector>.*)("|')""",component_file_text)
    if selector_search_result:
        try:
            return selector_search_result.group("selector")
        except:
            return None

def get_selector(file_name):
    with open(file_name, 'rt') as component_file:
        component_file_content = component_file.readlines()
        component_file_text = ''.join(component_file_content)
        return get_selector_from_text(component_file_text)


def main():
    selector = get_selector("./trial.container.ts")
    print("selector found: " + selector)
    find_dependents(selector, os.path.dirname(os.path.realpath(__file__)))


if __name__ == "__main__":
    main()
