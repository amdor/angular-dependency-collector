import find_components


def main():
    path = find_components.get_traverse_paths()
    components = find_components.gather_component_files(path)


if __name__ == "__main__":
    main()