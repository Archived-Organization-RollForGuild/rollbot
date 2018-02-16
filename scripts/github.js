const roomMap = {
  'rollbot': 'engineering',
  'rollforguild.com': 'website',
  'TheGM': 'api',
}





function rewriteGithubURL (url) {
  return url.replace(/api\.|\/repos/gi, '')
}





module.exports = robot => {
  robot.router.post('/github', (request, response) => {
    const eventType = request.headers['x-github-event']

    robot.emit(request.headers['x-github-event'], {
      ...request.body,
      room: roomMap[request.body.repository.name],
    })

    response.send('OK')
  })

  robot.on('pull_request', payload => {
    const {
      action,
      organization,
      pull_request,
      repository,
    } = payload

    const {
      assignees,
      body,
      html_url,
      labels,
      milestone,
      number,
      project,
      requested_reviewers,
      requested_teams,
      title,
      url,
      user,
    } = pull_request

    const attachment = {
      author_icon: user.avatar_url,
      author_link: rewriteGithubURL(user.url),
      author_name: user.login,
      fallback: `Pull request ${payload.action} by ${user.login} — #${number} ${pull_request.title}`,
      fields: [
        {
          short: true,
          title: 'Repo',
          value: `<${repository.url}|${repository.full_name}>`,
        },
        {
          short: true,
          title: 'Assigned to',
          value: !assignees.length ? 'None' : assignees.map(assignee => `<${rewriteGithubURL(assignee.url)}|${assignee.login}>`).join(', '),
        },
        {
          short: true,
          title: 'Reviewers',
          value: !(requested_reviewers.length || requested_teams.length) ? 'None' : requested_reviewers.concat(requested_teams).map(reviewer => `<${rewriteGithubURL(reviewer.url)}|${reviewer.login || reviewer.name}>`).join(', '),
        },
        {
          short: true,
          title: 'Milestone',
          value: !milestone ? 'None' : `<${rewriteGithubURL(milestone.url)}|${milestone.title}>`,
        },
        {
          title: 'Labels',
          value: !labels.length ? 'None' : labels.map(label => `\`<${rewriteGithubURL(label.url)}|${label.name}>\``).join(', '),
        },
      ],
      footer: `${organization.login}`,
      footer_icon: organization.avatar_url,
      text: body,
      title: `#${number} ${title}`,
      title_link: html_url,
      ts: (Date.now() / 1000).toFixed(),
    }

    if (/^(re)?opened|closed$/gi.exec(action)) {
      attachment.pretext = `<${rewriteGithubURL(user.url)}|${user.login}> ${action} a pull request on <${rewriteGithubURL(repository.url)}|${repository.full_name}>`

      if (/^(re)?opened$/gi.exec(action)) {
        attachment.color = '#42dca3'
      } else if (/^closed$/gi.exec(action)) {
        attachment.color = '#e74c3c'
      }
    } else {
      attachment.color = '#2384c6'
    }

    robot.messageRoom(roomMap[repository.name], {
      as_user: true,
      unfurl_links: false,
      attachments: [attachment]
    })
  })
}
