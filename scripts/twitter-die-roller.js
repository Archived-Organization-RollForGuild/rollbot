const Twitter = require('twitter')





function sum (array) {
  return array.reduce((accumulator, item) => accumulator + item, 0)
}

function rollDice (dice) {
  const results = []
  let [dieCount, dieSize] = dice.split('d')
  let diceRolled = 0

  dieCount = parseInt(dieCount)
  dieSize = parseInt(dieSize)

  while (diceRolled++ < dieCount) {
    results.push(Math.ceil(Math.random() * dieSize))
  }

  return results
}





module.exports = async robot => {
  const twitter = new Twitter({
    access_token_key: process.env.RFG_ROLLBOT_TWITTER_ACCESS_KEY,
    access_token_secret: process.env.RFG_ROLLBOT_TWITTER_ACCESS_SECRET,
    consumer_key: process.env.RFG_ROLLBOT_TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.RFG_ROLLBOT_TWITTER_CONSUMER_SECRET,
  })

  const diceFinderRegex = /(\d+d\d+)(?:\s*([-+/*])\s*(\d))?/gi

  const stream = twitter.stream('statuses/filter', { track: '@_rollbot' })

  stream.on('data', async tweet => {
    const {
      extended_tweet,
      id_str,
      text,
      user,
    } = tweet
    const tweetBody = extended_tweet ? extended_tweet.full_text : text
    const totals = []
    let matches = null
    let status = ''

    if (matches = tweetBody.match(diceFinderRegex)) {
      for (const match of matches) {
        const [, dice, modifier, modifierValue] = diceFinderRegex.exec(match)

        const results = rollDice(dice)

        const total = sum(results)

        let modifiedTotal = total

        status += `${dice}`

        if (modifier && modifierValue) {
          status += ` ${modifier} ${modifierValue}`
        }

        status += `: `

        if (results.length > 1) {
          status += `(${results.join(' + ')})`
        } else {
          status += `${results.join(' + ')}`
        }

        if (modifier && modifierValue) {
          status += ` ${modifier} ${modifierValue}`
          modifiedTotal = eval(`${total} ${modifier} ${modifierValue}`)
        }

        totals.push(modifiedTotal)

        status += ` = ${modifiedTotal}`

        status += '\n'

        diceFinderRegex.lastIndex = 0
      }

      status += '\n'

      status += `Total: ${sum(totals)}`

      console.log('================================================================================')
      console.log(`Responding to @${screen_name}:`)
      console.log(status)
      console.log('================================================================================')

      twitter.post('statuses/update', {
        auto_populate_reply_metadata: true,
        exclude_reply_user_ids: 977257179504893952,
        in_reply_to_status_id: id_str,
        status,
      })
      .catch(error => {
        console.log(error)
      })
    }
  })

  stream.on('error', function (error) {
    console.log('ERROR:', error)
  })
}
