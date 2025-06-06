#!/bin/sh

git filter-branch --env-filter '
    if [ "$GIT_COMMITTER_EMAIL" = "ansh@levitation.co.in" ]; then
        export GIT_COMMITTER_NAME="anshmourya"
        export GIT_COMMITTER_EMAIL="anshmourya657@gmail.com"
    fi
    if [ "$GIT_AUTHOR_EMAIL" = "ansh@levitation.co.in" ]; then
        export GIT_AUTHOR_NAME="anshmourya"
        export GIT_AUTHOR_EMAIL="anshmourya657@gmail.com"
    fi
' --tag-name-filter cat -- --all
