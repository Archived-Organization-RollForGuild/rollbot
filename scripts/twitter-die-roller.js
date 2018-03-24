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

  const activationRegex = /roll the dice|rtd/mi
  const diceFinderRegex = /(\d+d\d+)(?:\s*([-+/*])\s*(\d))?/gi

  const stream = twitter.stream('statuses/filter', { track: '@_rollbot' })

  stream.on('data', async ({ extended_tweet, id_str }) => {
    const tweet = extended_tweet.full_text
    const totals = []
    let status = ''

    if (activationRegex.test(tweet)) {
      const matches = tweet.match(diceFinderRegex)

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

      console.log('status', status)

      twitter.post('statuses/update', {
        auto_populate_reply_metadata: true,
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
