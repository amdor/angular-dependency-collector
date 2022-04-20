import os

from utils import extract_result, search_for_regex


def gather_files(root, regex):
    """
    Traverses through all subdirectories of root collecting `regex` filenames. Recursive.
    :param root: the basepoint of search (directory)
    :param regex: regex to match filenames with
    :return: all found filenames
    """
    files = set()
    for child in os.listdir(root):
        child_abs_path = os.path.join(root, child)
        if (os.path.isdir(child_abs_path) and ".git" not in child_abs_path and "node_modules" not in child_abs_path and "dir/" not in child_abs_path):
            files |= gather_files(child_abs_path, regex)
        elif extract_result(search_for_regex(regex, child)):
            files.add(child_abs_path)
            # print("File matched: " + child)
    return files
