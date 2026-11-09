import {
  getPublicCauses,
  getPublicCauseBySlug,
  getPublicNGOs,
  getPublicNGOById,
  getPublicImpactStats,
  getPublicImpactReports,
} from "../services/publicService.js";

export const listCauses = async (req, res, next) => {
  try {
    const causes = await getPublicCauses();

    res.json({
      success: true,
      data: causes.map((cause) => ({
        ...cause,
        ngoCount: cause.ngos.length,
        ngos: undefined,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getCauseDetails = async (req, res, next) => {
  try {
    const cause = await getPublicCauseBySlug(req.params.slug);

    if (!cause) {
      return res.status(404).json({
        success: false,
        message: "Cause not found",
      });
    }

    res.json({
      success: true,
      data: {
        ...cause,
        ngos: cause.ngos.map((item) => item.ngo),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listNGOs = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));

    const result = await getPublicNGOs({
      search: req.query.search?.trim(),
      city: req.query.city?.trim(),
      cause: req.query.cause?.trim(),
      page,
      limit,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getNGODetails = async (req, res, next) => {
  try {
    const ngo = await getPublicNGOById(req.params.id);

    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: "NGO not found",
      });
    }

    res.json({
      success: true,
      data: ngo,
    });
  } catch (error) {
    next(error);
  }
};

export const getImpactOverview = async (req, res, next) => {
  try {
    const [stats, stories] = await Promise.all([
      getPublicImpactStats(),
      getPublicImpactReports(6),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          ...stats,
          totalDonatedPaise: stats.totalDonatedPaise.toString(),
        },
        stories,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listImpactStories = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
    const stories = await getPublicImpactReports(limit);

    res.json({
      success: true,
      data: stories,
    });
  } catch (error) {
    next(error);
  }
};