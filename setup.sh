#!/bin/sh

# HomeBrewのインストール
if [ ! -x "`which brew`" ]; then
  /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
  brew update
fi

# mas-cliのインストール
if [ ! -x "`which mas`" ]; then
  brew install mas
fi



# 2. mas-cli
mas install 803453959 # Slack
mas install 405399194 # Kindle
mas install 880001334 # Reeder
mas install 568494494 # Pocket
mas install 417375580 # BetterSnapTool
mas install 497799835 # xcode
mas install 946399090 # telegram
mas install 443987910 # onepassword


# 3. homebrew-cask
brew cask install google-japanese-ime

brew cask install google-chrome
brew cask install firefox

brew cask install google-backup-and-sync
brew cask install dropbox

brew cask install adobe-acrobat-reader
brew cask install skype

brew cask install macs-fan-control
brew cask install scroll-reverser
brew cask install ccleaner
brew cask install alfred
brew cask install cheatsheet

brew cask install caprine
brew cask install dbeaver-community
brew cask install docker
brew cask install java
brew cask install mysqlworkbench
brew cask install ngrok
brew cask install sequel-pro