import os
import argparse
import re


def create_concat_file(userscript_file_name, js_files):
    """
    Append all files' content to the userscript file
    :param userscript_file_name: the file to append to
    :param js_files: the files from which the content will be added
    :return:
    """
    with open(userscript_file_name, 'rt') as us_file:
        us_file_content = us_file.readlines()
    with open(userscript_file_name, 'w') as us_file:
        us_file_end = us_file_content.pop()
        us_file_content_string = ''.join(us_file_content)
        # us_file.writelines(us_file_content)
        for js_file_name in js_files:
            with open(js_file_name) as js_file:
                print("Processing " + js_file_name)
                js_file_content = ''.join(js_file.readlines())
                js_file_title = "////START " + \
                    os.path.basename(js_file_name).upper() + "\n"
                if js_file_title not in us_file_content_string:
                    print("Creating new segment in userscript")
                    us_file_content_string += js_file_title
                    us_file_content_string += js_file_content
                else:
                    print('Adding new content to the segment')
                    seg_start_position = us_file_content_string.find(
                        js_file_title)
                    seg_end_position = us_file_content_string.find(
                        "////START", seg_start_position + len(js_file_title))
                    us_file_content_string = us_file_content_string[:seg_start_position] + \
                        js_file_title + js_file_content + \
                        us_file_content_string[seg_end_position:]
        us_file.write(us_file_content_string)
        us_file.write(us_file_end)


# already refactored code starts here

def extract_result(search_result):
    return None if not search_result else search_result[0]


def search_for_regex(expression, text, start_pos=0, end_pos=-1):
    if end_pos == -1:
        end_pos = len(text)
    search_result = re.compile(expression).search(text, start_pos, end_pos)
    # fallback
    if not search_result and start_pos > 0:
        return search_for_regex(expression, text, 0, len(text) - 1)
    return extract_result(search_result)


def gather_component_files(root):
    """
    Traverses through all subdirectories of root collecting *component.ts *container.ts filenames. Recursive.
    :param root: the basepoint of search
    :rtype: set
    :return: all found filenames
    """
    component_files = set()
    for child in os.listdir(root):
        abs_path = os.path.join(root, child)
        if (os.path.isdir(abs_path) and ".git" not in abs_path and "node_modules" not in abs_path and "dir/" not in abs_path):
            component_files |= gather_component_files(abs_path)
        elif search_for_regex("\.(container|component|directive)\.ts$", child):
            component_files.add(abs_path)
            print("Component found: " + child)
    return component_files


def get_traverse_paths():
    """
    Reads the command line arguments provided, or defaults to current path if no or not valid path is given
    :return: the directory paths to traverse
    """
    path = os.path.dirname(os.path.realpath(__file__))
    parser = argparse.ArgumentParser(
        description='Finds all components and containers')
    parser.add_argument('target_dir', nargs='?', default=path)
    namespace = parser.parse_args()
    if os.path.isdir(namespace.target_dir.strip()):
        path = namespace.target_dir

    print("Path to find all components in: ", path)
    return path


def main():
    path = get_traverse_paths()
    components = gather_component_files(path)


if __name__ == "__main__":
    main()
