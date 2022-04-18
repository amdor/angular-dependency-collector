import re


def extract_result(search_result):
    return None if not search_result else search_result[0]


def search_for_regex(expression, text, start_pos=0, end_pos=-1):
    if end_pos == -1:
        end_pos = len(text)
    search_result = re.compile(expression).search(text, start_pos, end_pos)
    # fallback
    if not search_result and start_pos > 0:
        return search_for_regex(expression, text, 0, len(text) - 1)
    return search_result