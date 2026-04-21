import { injectable } from 'inversify';
import { GoogleGenerativeAI, FunctionCall } from '@google/generative-ai';
import { ProjectFile } from '@models/project-file.model';
import { Gist } from '@entities/gist.entity';
import { TOOL_DEFINITIONS } from '@core/skills/tool.definition';
import { GetPracticesSkill } from '@core/skills/get-practices.skill';

export type ToolExecutor = (
	toolName: string,
	args: Record<string, unknown>
) => Promise<unknown>;

@injectable()
export class GeminiService {

	private readonly ai: GoogleGenerativeAI;
	private readonly GEMINI_TEXT_MODEL_AI: string;

	public constructor() {

		const apiKey     = process.env.GEMINI_API_KEY;
		const text_model = process.env.GEMINI_TEXT_MODEL_AI;

		if (!apiKey || !text_model) {
			throw new Error('GEMINI_API_KEY and GEMINI_TEXT_MODEL_AI env vars are required.');
		}

		this.ai                   = new GoogleGenerativeAI(apiKey);
		this.GEMINI_TEXT_MODEL_AI = text_model;

	}

	public async generateIntegrationProposal(
		gists:        Gist[],
		localFiles:   ProjectFile[],
		practicesIds: string[],
		onToolCall:   ToolExecutor
	): Promise<string> {

		const hasPractices = practicesIds.length > 0;

		const systemInstruction = `
		You are 'Qode AI', an expert software architect.
		Your goal is to analyze code snippets (Gists) and suggest how to integrate them into the
		user's local project, strictly following the best practices provided. 
		You must explain the "why" of every suggestion.

		${hasPractices
			? `IMPORTANT: This session has ${practicesIds.length} best-practice configuration(s) linked to it ` +
			  `(IDs: ${practicesIds.join(', ')}). ` +
			  `You MUST call the '${GetPracticesSkill.TOOL_NAME}' tool with these exact IDs as the first ` +
			  `action before writing any analysis. The tool returns JSON config files that define ` +
			  `project-specific coding standards you must follow during the integration.`
			: ''}

		YOUR RESPONSE MUST HAVE EXACTLY TWO PARTS:
		1. A detailed Markdown explanation of what changes will be made and why.
		2. AT THE END, a JSON code block delimited by \`\`\`json … \`\`\` with the files to modify or create.

		CRITICAL RULES FOR THE JSON:
		- MUST be perfectly valid JSON.
		- ALL backslashes (\\) inside string values MUST be escaped as (\\\\).
		- ALL double quotes (") inside string values MUST be escaped (\\").
		- Wrap the array STRICTLY in \`\`\`json … \`\`\` — no other delimiters.

		The JSON format MUST be EXACTLY:
		[
		  {
			"path": "src/app/new-file.ts",
			"content": "// complete source code here"
		  }
		]
		Paths must be relative to the project root.`.trim();

		const model = this.ai.getGenerativeModel({

			model: this.GEMINI_TEXT_MODEL_AI,
			systemInstruction,
			tools: [TOOL_DEFINITIONS as any]

		});

		const chat = model.startChat();

		let result = await chat.sendMessage(this.buildPrompt(gists, localFiles));

		while (true) {

			const functionCalls: FunctionCall[] | undefined = result.response.functionCalls();

			if (!functionCalls || functionCalls.length === 0) break;

			const toolResponses = await Promise.all(
				functionCalls.map(async (call: FunctionCall) => {

					const toolResult = await onToolCall(
						call.name,
						call.args as Record<string, unknown>
					);

					return {
						functionResponse: {
							name:     call.name,
							response: { content: JSON.stringify(toolResult) }
						}
					};

				})
			);

			result = await chat.sendMessage(toolResponses as any);

		}

		return result.response.text();

	}

	private buildPrompt(gists: Gist[], localContext: ProjectFile[]): string {

		let prompt = 'Here are the Gists the user wants to integrate:\n\n';

		gists.forEach((gist, index) => {
			prompt += `--- GIST ${index + 1}: ${gist.description ?? 'Untitled'} ---\n`;
			for (const key in gist.files) {
				const file = gist.files[key];
				prompt += `File: ${file.filename}\nContent:\n${file.content}\n\n`;
			}
		});

		prompt += '\nHere is the user\'s current local project context:\n\n';

		localContext.forEach(file => {
			if (file) {
				prompt += `--- LOCAL FILE: ${file.relativePath} ---\n${file.content}\n\n`;
			}
		});

		prompt += '\nPlease provide the refactored code and step-by-step instructions. '
		        + 'Remember to include the JSON block at the end.';

		return prompt;

	}

}
