#
# Executes commands at the start of an interactive session.
#
# Authors:
#   Sorin Ionescu <sorin.ionescu@gmail.com>
#

# Source Prezto.
if [[ -s "${ZDOTDIR:-$HOME}/.zprezto/init.zsh" ]]; then
  source "${ZDOTDIR:-$HOME}/.zprezto/init.zsh"
fi

# RN
export REACT_EDITOR=vscode

# for android
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Customize to your needs.
export PATH="$HOME/usr/local/bin/mysql:$PATH"
export PATH="$HOME/Library/Python/3.4/bin:$PATH"
export PATH=LOCAL_PATH:$PATH
export PATH="$HOME/.rbenv/bin:$PATH"
eval "$(rbenv init -)"

export GOPATH="$HOME/go"
export PATH="$PATH:$GOPATH/bin"
export GO15VENDOREXPERIMENT=1

# my github in ecdsa
export GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ecdsa"

# default tmux
tmux

# alias
alias xcode="open -a xcode"
alias vscode="open -a Visual\ Studio\ Code"
alias rmine="open -a RubyMine"
alias emacs="open -a Emacs"
alias ll="ls -la"
alias sl="sl -aF"
alias myth-truffle="docker run -v $(pwd):/tmp/ -w "/tmp/" marchand/mythril-alpine --truffle"

# docker
alias d='docker'
alias dc='docker-compose'
alias dcnt='docker container'
alias dcur='docker container ls -f status=running -l -q'
alias dexec='docker container exec -it $(dcur)'
alias dimg='docker image'
alias drun='docker container run --rm -d'
alias drunit='docker container run --rm -it'
alias dstop='docker container stop $(dcur)'


# tabtab source for electron-forge package
# uninstall by removing these lines or running `tabtab uninstall electron-forge`
[[ -f /Users/yosukeochiai/code/ganache/node_modules/tabtab/.completions/electron-forge.zsh ]] && . /Users/yosukeochiai/code/ganache/node_modules/tabtab/.completions/electron-forge.zsh
export PATH="/usr/local/opt/openssl/bin:$PATH"
export PATH="/usr/local/opt/icu4c/bin:$PATH"
export PATH="/usr/local/opt/icu4c/sbin:$PATH"


# psql
export PGDATA=/usr/local/var/postgres
