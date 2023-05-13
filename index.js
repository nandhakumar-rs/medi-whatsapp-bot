const express = require('express')
const axios = require('axios');
const parse = require('pdf-parse');
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
  try {
    const messagingService = new MessagingResponse()
    const incomingWhatsappMsg = req.body.Body
    const promptLanguage = await identifyPromptLanguage(incomingWhatsappMsg)
    const promptInEnglish = await convertThePromptToEnglish(incomingWhatsappMsg)
console.log(incomingWhatsappMsg);
    const response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: `${incomingWhatsappMsg}`,
      temperature: 0.9,
      max_tokens: 1500,
      top_p: 1,
      frequency_penalty: 0.0,
      presence_penalty: 0.6,
    
    })

if (req.body.NumMedia > 0) {
  const mediaUrl = req.body.MediaUrl0; // URL for the first media file
  const mediaContentType = req.body.MediaContentType0; // MIME type of the first media file

  // Download the file
  const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });

  const data = await parse(response.data)
  // Convert the data to a string (for text files)
  // const fileContent = Buffer.from(response.data, 'binary').toString('utf8');

  // Now you can use fileContent
  console.log(data.text, "Type ===> ",mediaContentType);

}
    const messageFromBot = response.data.choices[0].text
    messagingService.message(`${messageFromBot}`)

    console.log('messageFromBot', messageFromBot)
    res.writeHead(200, { 'Content-Type': 'text/xml' })

    console.log('Message String', messagingService.toString())

    res.end(messagingService.toString())
  } catch (err) {
    console.log(err)
  }
})

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`)
})
