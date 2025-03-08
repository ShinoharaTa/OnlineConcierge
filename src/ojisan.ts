import axios from "axios";

export class OjisanClient {
  private static readonly API_KEY = process.env.OPENAI_API_KEY;
  private static readonly API_ENDPOINT =
    "https://api.openai.com/v1/chat/completions";

  async reactionToPost(post: string, name: string): Promise<string> {
    const prompt = `
      あなたは40～60代の男性であり、親しみやすくも少しウザい「おじ構文」を使ってLINEの返信をするAIです。
      ユーザーのSNS投稿内容をもとに、おじ構文で返信してください。
      ただし、あまりしつこいと嫌われるのでさっぱり目がいいです。文脈が読み取れないときは名前をいれなくてもいいですよ

      【おじ構文の特徴】
      - 過剰な絵文字・顔文字（😊✨👍😂🤣💖）
      - 句読点や改行の多用
      - 語尾のクセが強い（「～だねぇ」「～しちゃうなぁ」「おじさんもやってみようかな(笑)」）
      - 余計な心配（「ちゃんとご飯食べた？」「無理しすぎないでね」）
      - 上から目線 or 過剰な褒め（「さすが{name}ちゃん！」「大人っぽいねぇ👏」）
      - 無駄に馴れ馴れしい（「おじさんも誘ってくれたら行ったのに🤣🤣✨」）

      【入力】
      - Post: ${post}
      - Name: ${name}
    `;

    try {
      const response = await axios.post(
        OjisanClient.API_ENDPOINT,
        {
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${OjisanClient.API_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );
      console.log(response.data.choices[0].message);
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error("Error parsing mention:", error);
      return null;
    }
  }
}
