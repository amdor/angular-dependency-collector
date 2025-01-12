# angular-dependency-collector

## find-components.py
Finds all containers/directives/components in the given repository
```
python .\find_components.py path/to/angular/app/repo
```

## main.py
Uses find-components.py and map component dependencies into a `dependencies.json` file to the dependency-app project's assets (dependency-app/src/assets)

```
python .\main.py path/to/angular/app/repo
```

## Dependency app
Inside the dependency-app, install dependencies via `npm i`
To run the app use `npm start`
In the app there are 2 options to choose from:
1. Load automatic lazy trees
    - tries to identify lazyloadable cliques after removing the biggest connectors from the graph. removing them means they are assumed to be present at bootstrap so every (lazy loaded) component can include them
    - clicking `next graph` plots these cliques one by one
    - the console shows a list of the cliques and the deleted connectors 

2. Load manual clique selection
    - in this mode the whole graph is presented, except nodes in `allRemove`, more on that later
    - you can rearrange the nodes, positions are saved into localstorage
    - by double-clicking you can delete a node with all its edges, deleted nodes are recorded in an array, logged to the consolle at every deletion. deletion is not permanent, when you refresh the page, deleted nodes reappear.
    - red nodes are sources (only outgoing edges), blues are sinks (only incoming edges), greens are connectors, and purples mean `allRootProvide` array contains a node that depends on this one, lazyly loading a component that a "root provided" component uses is a dangerous game to play
    - `allRemove` and `allRootProvide` arrays can be manually edited in src/app/manual-search-results.ts
        - `allRemove`'s items will not be presented in the graph, but their items also will not be checked for still existing dependents
        - `allRootProvide` is the opposite, items won't be excluded, but will mark all items' dependents with purple
    - right clicking a node will keep the highlight on that node, so you can rearrange the subtree as you please. double-click the page anywhere to remove the highlighting
