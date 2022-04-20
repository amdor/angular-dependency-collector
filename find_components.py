import os
import argparse
from indexer import gather_files

def gather_component_files(root):
    """
    Traverses through all subdirectories of root collecting *component.ts *container.ts filenames. Recursive.
    :param root: the basepoint of search (directory)
    :rtype: set
    :return: all found filenames
    """
    component_files = gather_files(root, "\.(container|component|directive)\.ts$")
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
    gather_component_files(path)


if __name__ == "__main__":
    main()
