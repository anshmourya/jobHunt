# Get all commit hashes
$commits = git rev-list --all

# Loop through each commit and update author if needed
foreach ($commit in $commits) {
    $authorInfo = git show -s --format="%an|%ae" $commit
    $name, $email = $authorInfo -split '\|'
    
    if ($email -eq "ansh@levitation.co.in") {
        Write-Host "Updating commit $commit"
        git filter-branch -f --env-filter "
            if [ \"`$GIT_COMMITTER_EMAIL\" = \"ansh@levitation.co.in\" ]; then
                export GIT_COMMITTER_NAME=\"anshmourya\"
                export GIT_COMMITTER_EMAIL=\"anshmourya657@gmail.com\"
            fi
            if [ \"`$GIT_AUTHOR_EMAIL\" = \"ansh@levitation.co.in\" ]; then
                export GIT_AUTHOR_NAME=\"anshmourya\"
                export GIT_AUTHOR_EMAIL=\"anshmourya657@gmail.com\"
            fi
        " --tag-name-filter cat -- --all
    }
}
