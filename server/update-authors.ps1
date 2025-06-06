# Update author and committer name and email for all commits
$oldEmail = "ansh@levitation.co.in"
$newName = "anshmourya"
$newEmail = "anshmourya657@gmail.com"

git filter-branch --env-filter @"
if [ "`$GIT_COMMITTER_EMAIL" = "$oldEmail" ]; then
    export GIT_COMMITTER_NAME="$newName"
    export GIT_COMMITTER_EMAIL="$newEmail"
fi
if [ "`$GIT_AUTHOR_EMAIL" = "$oldEmail" ]; then
    export GIT_AUTHOR_NAME="$newName"
    export GIT_AUTHOR_EMAIL="$newEmail"
fi
"@ --tag-name-filter cat -- --all
