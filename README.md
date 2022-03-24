# Installation:
npm install -g ./

# Options:
> --log              Enable console logging
> 
> --no-watching      Create the final directory and quit
> 
> --delete           Delete destination folder's content before starting
> 
> --merge-files      Merge similar files
>                     JSON files   : [npm deepmerge] is used
>                     *    files   : For yielding:
>                                   #ABJAD_EXTENDER_YIELD=section_name#
>                                 : For section creation:
>                                   #ABJAD_EXTENDER_SECTION=section_name to Replace
>                                   #ABJAD_EXTENDER_SECTION_APPEND=section_name to Append
>                                   #ABJAD_EXTENDER_SECTION_APPEND_LN=section_name to Append with a line break
>                                   #ABJAD_EXTENDER_SECTION_PREPEND=section_name to Prepend
> --help (-h)        Show Help

```
COMMAND: lightmgr <OPTIONS>
```