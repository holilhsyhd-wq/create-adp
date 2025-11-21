import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      name,
      userId,
      eggId,
      memory,
      disk,
      cpu,
      allocationId,
      dockerImage,
      startup
    } = body;

    const panelUrl = process.env.PTERO_PANEL_URL;
    const apiKey = process.env.PTERO_API_KEY;

    if (!panelUrl || !apiKey) {
      return NextResponse.json(
        { message: 'PTERO_PANEL_URL atau PTERO_API_KEY belum diset.' },
        { status: 500 }
      );
    }

    const pteroPayload = {
      name,
      user: userId,
      egg: eggId,
      docker_image: dockerImage && dockerImage.trim() ? dockerImage : undefined,
      startup: startup && startup.trim() ? startup : undefined,
      limits: {
        memory,  // dari frontend: 0 (unlimited) atau MB
        swap: 0,
        disk,    // MB
        io: 500,
        cpu      // 0 = unlimited
      },
      feature_limits: {
        databases: 2,
        allocations: 1,
        backups: 2
      },
      allocation: {
        default: allocationId
      },
      environment: {
        // Sesuaikan dengan egg kamu, ini contoh:
        SERVER_JARFILE: 'server.jar'
      }
    };

    const res = await fetch(`${panelUrl}/api/application/servers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(pteroPayload)
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Pterodactyl API error:', data);
      return NextResponse.json(
        { message: 'Pterodactyl API error', details: data },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('Internal error:', err);
    return NextResponse.json(
      { message: 'Internal server error', error: err?.message },
      { status: 500 }
    );
  }
}
