const profileService = require('../services/app_profile.service')
const { sendSuccess } = require('../utils/response')
const path = require('path')

const getProfile = async (req, res, next) => {
  try {
    const data = await profileService.getProfile(req.appUser.id)
    return sendSuccess(res, { data })
  } catch (err) {
    next(err)
  }
}

const updateProfile = async (req, res, next) => {
  try {
    const { username, password, name, phone } = req.body
    const data = await profileService.updateProfile(req.appUser.id, { username, password, name, phone })
    return sendSuccess(res, { message: 'Profile updated', data })
  } catch (err) {
    next(err)
  }
}

const uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' })
    }
    // Build relative URL path (served as static)
    const photoUrl = `/uploads/profiles/${req.file.filename}`
    const data = await profileService.updateProfilePhoto(req.appUser.id, photoUrl)
    return sendSuccess(res, { message: 'Profile photo updated', data })
  } catch (err) {
    next(err)
  }
}

module.exports = { getProfile, updateProfile, uploadPhoto }
