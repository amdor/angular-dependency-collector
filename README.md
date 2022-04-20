# angular-dependency-collector

## find-components.py
Finds all containers/directives/components in the given repository
```
python .\find_components.py path/to/angular/app/repo
```

## main.py
Use find-components.py and map component dependencies into a `dependencies.json` file to the dependency-app project

```
python .\main.py path/to/angular/app/repo
```