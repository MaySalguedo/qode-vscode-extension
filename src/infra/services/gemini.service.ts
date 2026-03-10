// src/infra/services/gemini.service.ts
import { injectable } from "inversify";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ProjectFile } from "@models/project-file.model";
import { Gist } from "@entities/gist.entity";

@injectable()
export class GeminiService {

	private ai: GoogleGenerativeAI;
	private GEMINI_TEXT_MODEL_AI: string;

	public constructor() {

		const apiKey = process.env.GEMINI_API_KEY;
		const text_model = process.env.GEMINI_TEXT_MODE_AI

		if (!apiKey || !text_model) throw new Error("GEMINI env is not defined");

		this.ai = new GoogleGenerativeAI(apiKey);
		this.GEMINI_TEXT_MODEL_AI = text_model;

	}

	public async generateIntegrationProposal(gists: Array<Gist>, localContext: Array<ProjectFile>): Promise<string> {
		
		const systemInstruction = `
			You are 'Qode AI', an expert software architect.
			Your goal is to analyze code snippets (Gists) and 
			suggest how to integrate them into the user's local 
			project strictly following the best practices of Clean Architecture, SOLID, and clean code.
			You must explained the "why" of your suggestion based opun the gists

			YOUR RESPONSE MUST STRICTLY HAVE TWO PARTS:
			1. A detailed explanation in Markdown about what changes will be made and why.
			2. AT THE END, an exact JSON code block delimited by \`\`\`json and \`\`\` containing an array of the files to modify or create.
			
			CRITICAL RULES FOR THE JSON:
			- MUST be perfectly valid JSON.
			- ALL backslashes (\\) inside string values MUST be properly escaped as (\\\\).
			- ALL double quotes (") inside string values MUST be properly escaped (\\").
			- DO NOT use \\json or any custom delimiters. You must wrap the array strictly in \`\`\`json ... \`\`\`.
			
			The JSON format MUST be EXACTLY this:
			[
			  {
				"path": "src/app/new-file.ts",
				"content": "// complete source code here"
			  }
			]
			Ensure the path is relative to the project root.`;
/**/
		const model = this.ai.getGenerativeModel({ 

			model: this.GEMINI_TEXT_MODEL_AI,
			systemInstruction: systemInstruction 

		});

		const prompt = this.buildPrompt(gists, localContext);

		const result = await model.generateContent(prompt);
		return result.response.text();

	}

	private buildPrompt(gists: Gist[], localContext: ProjectFile[]): string {
		let prompt = `Here are the Gists that the user wants to integrate:\n\n`;

		gists.forEach((gist, index) => {

			prompt += `--- GIST ${index + 1}: ${gist.description || 'Untitled'} ---\n`;

			for (const key in gist.files) {

				const file = (gist.files as any)[key];
				prompt += `File: ${file.filename}\nContenido:\n${file.content}\n\n`;

			}

		});

		prompt += `\nNow, here is the context of the user's current local project so you know where and how to integrate it:\n\n`;

		localContext.forEach(file => {

			if (file) {

				prompt += `--- LOCAL FILE: ${file.relativePath} ---\n${file.content}\n\n`;

			}

		});

		prompt += `\nPlease provide the refactored code and step-by-step instructions. Remember the JSON block at the end.`;

		return prompt;
	}
}