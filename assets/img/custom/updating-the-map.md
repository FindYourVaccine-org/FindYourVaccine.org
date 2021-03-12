# SVG editing for the FYV map

## combining paths

to "join" paths with existing state paths, use the *Path > Combine path* menu in inkscape while both paths are selected. this will give an effect like New jersey (?) or Hawaii, where multiple separate shapes are represented by one path. this will make the later step of copying the paths into the HTML of the page easier

## copying the paths into the page

once you are done editing, save the SVG and open in a text editor.
 
because there is CSS acting on the SVG (and possibly also because the svg has had links added to it once it is in the page) the final SVG image that people see when they view the page is embedded as part of the HTML markup. 

### to change a state on the map

to change a state's path copy-paste your edited `<path>` tag for that state and replace the existing `path` tag for that state in the `splash.html`, viewing the page (possibly after a refresh) should allow you to see your changes. the clickable areas will also automatically update.



