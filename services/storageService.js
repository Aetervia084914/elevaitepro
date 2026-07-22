
import { CandidateSchema, ClientSchema } from '../datastore.js';

const TALENT_POOL_KEY = 'career_lift_talent_pool';
const CLIENTS_KEY = 'elevaite_clients_pool';

// In-memory mock data for session (non-persistent)
let _talentPool = [];
let _clients = [];

export const storageService = {
	getTalentPool: () => _talentPool,
	getClients: () => _clients,
	saveClient: (client) => {
		const idx = _clients.findIndex(c => c.id === client.id);
		if (idx > -1) {
			_clients[idx] = client;
		} else {
			_clients.push(client);
		}
	},
	placeCandidateWithClient: (candidateContact, clientId, fee) => {
		// Find candidate and client, update placement
		const candidateIdx = _talentPool.findIndex(c => c.contact === candidateContact);
		if (candidateIdx > -1) {
			_talentPool[candidateIdx] = {
				..._talentPool[candidateIdx],
				placedWithClientId: clientId,
				placementDate: Date.now(),
			};
		}
		const clientIdx = _clients.findIndex(c => c.id === clientId);
		if (clientIdx > -1) {
			_clients[clientIdx] = {
				..._clients[clientIdx],
				placementsCount: (_clients[clientIdx].placementsCount || 0) + 1,
				totalBusinessBrought: (_clients[clientIdx].totalBusinessBrought || 0) + (fee || 0),
			};
		}
	},
};
