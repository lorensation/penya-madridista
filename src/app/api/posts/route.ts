import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get search params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    
    // Create Supabase client
    const supabase = await createServerSupabaseClient();
    
    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    // Build query
    let query = supabase
      .from('posts')
      .select('*', { count: 'exact' });
    
    // Add search filter if provided
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }
    
    // Execute query with pagination and ordering
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }
    
    // Log successful response for debugging
    console.log('Posts API response:', {
      postsCount: data?.length || 0,
      totalCount: count || 0,
      page,
      limit
    });
    
    // Calculate total pages
    const totalPages = Math.ceil((count || 0) / limit);
    
    return NextResponse.json({
      posts: data || [],
      totalCount: count || 0,
      totalPages,
      currentPage: page
    });
  } catch (error) {
    console.error('Exception in posts API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}