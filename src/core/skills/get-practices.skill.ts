import { injectable, inject } from 'inversify';
import { TYPES } from '@IoC/types';
import { FirebaseService } from '@infra/services/firebase.service';
import { GithubService } from '@infra/services/github.service';
import { GistFile } from '@models/gist-file.model';

@injectable()
export class GetPracticesSkill {

	public static readonly TOOL_NAME = 'get_practices';
	public static readonly TOOL_DESCRIPTION =
		'Retrieves technical configuration files from the project best practices. ' +
		'Each best practice maps to one or more GitHub Gists containing practice.config.json files ' +
		'that define specific rules, patterns, and coding standards to apply during integration. ' +
		'Call this tool first when practicesIds are available in the session context.';

	public constructor(
		@inject(TYPES.FirebaseService) private readonly firebaseService: FirebaseService,
		@inject(TYPES.GithubService) private readonly githubService: GithubService
	) {}

	public async execute(practiceIds: string[]): Promise<GistFile[]> {

		if (practiceIds.length === 0) return [];

		const practices = await this.firebaseService.getBestPracticesByIds(practiceIds);

		const gistIds = practices.flatMap(practice => practice.gist ?? []);

		if (gistIds.length === 0) return [];

		const gists = await this.githubService.getGists(gistIds);

		return gists.map(gist => gist.files['practice.config.json']).filter((file): file is GistFile => file !== undefined);

	}

}
