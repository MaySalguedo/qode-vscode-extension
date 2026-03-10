import { injectable } from "inversify";
import axios from "axios";
import { AxiosResponse } from "axios";

import { Gist } from '@entities/gist.entity';
import { GistFile } from '@models/gist-file.model';

@injectable() export class GithubService {

	private readonly API_URL = 'https://api.github.com';
	private readonly gists = 'gists';

	public async getGist(id: string): Promise<AxiosResponse<Gist>> {

		return await axios.get(`${this.API_URL}/${this.gists}/${id}`, {

			headers: {

				'Accept': 'application/vnd.github.v3+json',
				'User-Agent': 'Qode-VSCode-Extension'

			}

		});

	}

}