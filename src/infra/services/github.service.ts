import { injectable } from "inversify";
import axios from "axios";
import { AxiosResponse } from "axios";

import { Gist } from '@entities/gist.entity';
import { GistFile } from '@models/gist-file.model';

@injectable() export class GithubService {

	private readonly API_URL  = 'https://api.github.com';
	private readonly GISTS_SEGMENT = 'gists';

	public async getGist(id: string): Promise<Gist> {

		const response: AxiosResponse<Gist> = await axios.get(
			`${this.API_URL}/${this.GISTS_SEGMENT}/${id}`,
			{
				headers: {
					'Accept':     'application/vnd.github.v3+json',
					'User-Agent': 'Qode-VSCode-Extension'
				}
			}
		);

		return response.data;

	}

	public async getGists(ids: string[]): Promise<Array<Gist>> {

		if (ids.length === 0) return [];

		const results = await Promise.all(ids.map(id => this.getGist(id)));

		return results.filter((gist)=> gist !== undefined);

	}

}