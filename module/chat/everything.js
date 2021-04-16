'use strict'

import { ChatProcessor } from '../chat.js'
import { parselink } from '../../lib/parselink.js'
import { isNiceDiceEnabled } from '../../lib/utilities.js'

export class EveryoneAChatProcessor extends ChatProcessor {
  help() { return "/everyone (or /ev) &lt;formula&gt;" }
  isGMOnly() { return true }

  matches(line) {
    this.match = line.match(/^\/(everyone|ev) ([fh]p) reset/i)
    return !!this.match
  }
  process(line, msgs) {
    let m = this.match  
    let any = false
    canvas.tokens.ownedTokens.forEach(t => {
      let actor = t.actor
      if (actor.hasPlayerOwner) {
        any = true
        let attr = m[2].toUpperCase()
        let max = actor.data.data[attr].max
        actor.update({ ['data.' + attr + '.value']: max })
        this.priv(`${actor.displayname} ${attr} reset to ${max}`, msgs)
      }
    })
    if (!any) this.priv(`There are no player owned characters!`, msgs)
  }
}

export class EveryoneBChatProcessor extends ChatProcessor {
  help() { return null }    // Don't display a help line for this processor.  Useful if you have multiple processors for essentially the same command
  isGMOnly() { return true }

  matches(line) {
    this.match = line.match(/^\/(everyone|ev) \[(.*)\]/i)
    return !!this.match
  }
  
  async process(line, msgs) {
    let m = this.match  
    let any = false
    let action = parselink(m[2].trim())
    if (!!action.action) {
      if (!['modifier', 'chat', 'pdf'].includes(action.action.type)) {
        for (const t of canvas.tokens.ownedTokens) {
          let actor = t.actor
          if (actor.hasPlayerOwner) {
            any = true;
            await GURPS.performAction(action.action, actor)
           }
         }
        if (!any) this.priv(`There are no player owned characters!`, msgs)
      } else this.priv(`Not allowed to execute Modifier, Chat or PDF links [${m[2].trim()}]`, msgs)
    } else this.priv(`Unable to parse On-the-Fly formula: [${m[2].trim()}]`, msgs)
  }
}

export class EveryoneCChatProcessor extends ChatProcessor {
  help() { return null }    // Don't display a help line for this processor.  Useful if you have multiple processors for essentially the same command
  isGMOnly() { return true }

  matches(line) { // /everyone +1 fp or /everyone -2d-1 fp
    this.match = line.match(/^\/(everyone|ev) ([fh]p) *([+-]\d+d\d*)?([+-=]\d+)?(!)?/i)
    return !!this.match
  }
  process(line, msgs) {
    let m = this.match  
    if (!!m[3] || !!m[4]) {
      let any = false
      canvas.tokens.ownedTokens.forEach(t => {
        let actor = t.actor
        if (actor.hasPlayerOwner) {
          any = true
          let mod = m[4] || ''
          let value = mod
          let dice = m[3] || ''
          let txt = ''
          if (!!dice) {
            let sign = dice[0] == '-' ? -1 : 1
            let d = dice.match(/[+-](\d+)d(\d*)/)
            let r = d[1] + 'd' + (!!d[2] ? d[2] : '6')
            let roll = Roll.create(r).evaluate()
            if (isNiceDiceEnabled()) game.dice3d.showForRoll(roll, game.user, msgs.data.whisper)
            value = roll.total
            if (!!mod)
              if (isNaN(mod)) {
                ui.notifications.warn(`Unrecognized format for '${line}'`)
                return
              } else value += parseInt(mod)
            value = Math.max(value, !!m[5] ? 1 : 0)
            value *= sign
            txt = `(${value}) `
          }
          let attr = m[2].toUpperCase()
          let cur = actor.data.data[attr].value
          let newval = parseInt(value)
          if (isNaN(newval)) {
            // only happens on =10
            newval = parseInt(value.substr(1))
            if (isNaN(newval)) {
              ui.notifications.warn(`Unrecognized format for '${line}'`)
              return
            }
          } else newval += cur
          let mtxt = ''
          let max = actor.data.data[attr].max
          if (newval > max) {
            newval = max
            mtxt = `(max: ${max})`
          }
          actor.update({ ['data.' + attr + '.value']: newval })
          this.priv(`${actor.displayname} ${attr} ${dice}${mod} ${txt}${mtxt}`, msgs)
        }
      })
      if (!any) this.priv(`There are no player owned characters!`, msgs)
    } else  // Didn't provide dice or scalar, so maybe someone else wants to handle it
     ui.notification.warn(`There was no dice or number formula to apply '${line}'`)
  }
}

