
import { prisma } from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";

const getNGOForUser = (userId) =>
  prisma.nGOProfile.findUnique({
    where: { userId },
  });


const serializeProfile = (ngo) => ({
  id: ngo.id,
  organizationName: ngo.organizationName,
  legalName: ngo.legalName,
  registrationNumber: ngo.registrationNumber,
  description: ngo.description,
  mission: ngo.mission,
  vision: ngo.vision,
  website: ngo.website,
  phone: ngo.phone,
  address: ngo.address,
  city: ngo.city,
  state: ngo.state,
  country: ngo.country,
  minimumDonation:
    ngo.minimumDonationPaise != null
      ? Number(ngo.minimumDonationPaise) / 100
      : "",
  logoUrl: ngo.logoUrl,
  galleryUrls: ngo.galleryUrls,
  status: ngo.status,
  verifiedAt: ngo.verifiedAt,
  createdAt: ngo.createdAt,
  updatedAt: ngo.updatedAt,
});


export const getNGOProfile = asyncHandler(async (req, res) => {
  const ngo = await getNGOForUser(req.user.id);

  if (!ngo) {
    res.status(404);
    throw new Error("NGO profile not found.");
  }

  res.json({
    success: true,
    data: serializeProfile(ngo),
  });
});

export const updateNGOProfile = asyncHandler(async (req, res) => {
  const ngo = await getNGOForUser(req.user.id);

  if (!ngo) {
    res.status(404);
    throw new Error("NGO profile not found.");
  }

  const {
    organizationName,
    legalName,
    registrationNumber,
    description,
    mission,
    vision,
    website,
    phone,
    address,
    city,
    state,
    country,
    minimumDonation,
    logoUrl,
    galleryUrls,
  } = req.body;

  const updated = await prisma.nGOProfile.update({
    where: { id: ngo.id },
    data: {
      organizationName,
      legalName: legalName || null,
      registrationNumber: registrationNumber || null,
      description: description || null,
      mission: mission || null,
      vision: vision || null,
      website: website || null,
      phone: phone || null,
      address: address || null,
      city: city || null,
      state: state || null,
      country,
      minimumDonationPaise:
        minimumDonation == null
          ? null
          : BigInt(Math.round(minimumDonation * 100)),
      logoUrl: logoUrl || null,
      ...(galleryUrls !== undefined ? { galleryUrls } : {}),
    },
  });

  res.json({
    success: true,
    message: "Organization profile updated successfully.",
    data: serializeProfile(updated),
  });
});
