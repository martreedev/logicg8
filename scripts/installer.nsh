; LogicG8 installer add-ons.
;
; electron-builder's fileAssociations config already points the .logic
; extension at the LogicG8.logic ProgID (and registers the open command and
; icon). What it does not do is add a ShellNew key, so .logic files never show
; up in the Explorer "New" context menu. These macros fill that gap.
;
; `customInstall` runs after the file association is registered, and
; `customUnInstall` runs during uninstall. Both use SHELL_CONTEXT so the
; entries land in HKCU for a per-user install or HKLM for a per-machine one.

!macro customInstall
  ; An empty NullFile value tells Explorer to create a blank .logic file
  ; ("New Logic File.logic") when the user picks "Logic File" from New.
  WriteRegStr SHELL_CONTEXT "Software\Classes\.logic\ShellNew" "NullFile" ""
!macroend

!macro customUnInstall
  DeleteRegKey SHELL_CONTEXT "Software\Classes\.logic\ShellNew"
!macroend
