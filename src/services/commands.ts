import * as fastify from 'fastify';

import commands from '../configs/commands';

type Command = {
    name: string;
    aliases: string[];
}

export default async function (
    { query: { project } }: CoreRequest | fastify.FastifyRequest
): Promise<{ data: { commands: Command[] } }> {
    const list = commands
        .filter(cmd => cmd.projects.includes(project))
        .map(({ name, aliases }) => ({ name, aliases }));

    return { data: { commands: list } };
}