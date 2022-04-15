import os


def get_selector(file_name):
    with open(file_name, 'rt') as component_file:
        component_file_content = component_file.readlines()


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


def main():
    path = get_traverse_paths()
    components = gather_component_files(path)


if __name__ == "__main__":
    main()
