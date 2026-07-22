"""
API route for clearing all candidate data (admin operation)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.async_db import get_async_conn
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class ClearDataRequest(BaseModel):
    email: str

@router.post("/clear-candidate-data")
async def clear_candidate_data(request: ClearDataRequest):
    """
    Clear all data for a candidate by email address.
    
    This operation:
    1. Deletes from useranalysis
    2. Deletes from usercompletedgaps
    3. Deletes from user_cv_upload
    4. Deletes from userjourney
    
    All operations are wrapped in a transaction.
    """
    email = request.email.lower().strip()
    
    if not email or '@' not in email:
        raise HTTPException(status_code=400, detail="Valid email is required")
    
    logger.info(f"[ClearCandidateData] Starting data deletion for email: {email}")
    
    try:
        async with get_async_conn() as conn:
            # Find candidate ID
            cur = await conn.execute("""
                SELECT id FROM public.candidates WHERE email = %s
            """, (email,))
            
            result = await cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail=f"No candidate found with email: {email}")
            
            candidate_id = result[0]
            logger.info(f"[ClearCandidateData] Found candidate_id: {candidate_id}")
            
            # Delete from useranalysis
            cur = await conn.execute("""
                DELETE FROM public.useranalysis
                WHERE candidate_id = %s
            """, (candidate_id,))
            deleted_analysis = cur.rowcount
            logger.info(f"[ClearCandidateData] Deleted {deleted_analysis} rows from useranalysis")
            
            # Delete from usercompletedgaps
            cur = await conn.execute("""
                DELETE FROM public.usercompletedgaps
                WHERE user_id = %s
            """, (candidate_id,))
            deleted_gaps = cur.rowcount
            logger.info(f"[ClearCandidateData] Deleted {deleted_gaps} rows from usercompletedgaps")
            
            # Delete from user_cv_upload
            cur = await conn.execute("""
                DELETE FROM public.user_cv_upload
                WHERE candidate_id = %s
            """, (candidate_id,))
            deleted_cv = cur.rowcount
            logger.info(f"[ClearCandidateData] Deleted {deleted_cv} rows from user_cv_upload")
            
            # Delete from userjourney
            cur = await conn.execute("""
                DELETE FROM public.userjourney
                WHERE user_id = %s
            """, (candidate_id,))
            deleted_journey = cur.rowcount
            logger.info(f"[ClearCandidateData] Deleted {deleted_journey} rows from userjourney")
            
            # Commit transaction
            await conn.commit()
            
            logger.info(f"[ClearCandidateData] Successfully cleared all data for {email}")
            
            return {
                "success": True,
                "message": f"Successfully cleared all data for {email}",
                "deleted": {
                    "useranalysis": deleted_analysis,
                    "usercompletedgaps": deleted_gaps,
                    "user_cv_upload": deleted_cv,
                    "userjourney": deleted_journey
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ClearCandidateData] Error clearing data for {email}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
