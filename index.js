const express = require('express')
const dotEnv = require('dotenv')
dotEnv.config({ path: '.env' })
const { MessagingResponse } = require('twilio').twiml
const { Configuration, OpenAIApi } = require('openai')

const configuration = new Configuration({
  apiKey: process.env.OPEN_AI_KEY,
})
const openai = new OpenAIApi(configuration)

const app = express()
const port = 4000

app.use(express.urlencoded({ extended: true }))

const identifyPromptLanguage = async (prompt) => {
  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: `Human: Identify the language of the following phrase:${prompt}, note: give me the language name alone`,
    temperature: 0.9,
    max_tokens: 150,
    top_p: 1,
    frequency_penalty: 0.0,
    presence_penalty: 0.6,
    stop: [' Human:', ' AI:'],
  })

  return response.data.choices[0].text.split(':')[0]
}

const convertThePromptToEnglish = async (prompt) => {
  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: `Human: Convert the following phrase to English:${prompt}`,
    temperature: 0.9,
    max_tokens: 150,
    top_p: 1,
    frequency_penalty: 0.0,
    presence_penalty: 0.6,
    stop: [' Human:', ' AI:'],
  })

  return response.data.choices[0].text
}

app.post('/whatsapp', async (req, res) => {
  const messagingService = new MessagingResponse()
  const incomingWhatsappMsg = req.body.Body
  console.log('incomingWhatsappMsg', '====>', incomingWhatsappMsg)
  const promptLanguage = await identifyPromptLanguage(incomingWhatsappMsg)
  const promptInEnglish = await convertThePromptToEnglish(incomingWhatsappMsg)

  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: `Human: ${incomingWhatsappMsg}`,
    temperature: 0.9,
    max_tokens: 150,
    top_p: 1,
    frequency_penalty: 0.0,
    presence_penalty: 0.6,
    stop: [' Human:', ' AI:'],
  })

  const messageFromBot = response.data.choices[0].text?.split(': ')[1] || ''
  messagingService.message(
    `${promptLanguage}: ${messageFromBot}, in English: ${promptInEnglish}`,
  )

  console.log('messageFromBot', messageFromBot)
  res.writeHead(200, { 'Content-Type': 'text/xml' })

  console.log('Message String', messagingService.toString())

  res.end(messagingService.toString())
})

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`)
})
