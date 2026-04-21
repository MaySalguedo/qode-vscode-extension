import { GetPracticesSkill } from './get-practices.skill';

export const TOOL_DEFINITIONS = {
	functionDeclarations: [
		{
			name: GetPracticesSkill.TOOL_NAME,
			description: GetPracticesSkill.TOOL_DESCRIPTION,
			parameters: {
				type: 'object',
				properties: {
					ids: {
						type: 'array',
						items: { type: 'string' },
						description:
							'Array of best-practice document IDs from the Firestore "best-practices" collection.'
					}
				},
				required: ['ids']
			}
		}
	]
};
