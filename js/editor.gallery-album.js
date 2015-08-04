$(function(){
	(function() {
		/* data models */
		var galleryModel = this.galleryModel = new cGalleryEditorModel({
			$dataProvider: $('#album-edit')
		});
		var gallery = new cGalleryEditor({
			model: galleryModel
		});
		var uploader = new cUploader({
			view: gallery,
			dom: {
				$ghost: $("#uploadPictureButtonGhost"),
				$caller: $('*[data-uploader]')
			},
			callback: {
				changeGalleryCover: galleryModel.changeGalleryCover,
				addPictureItem: galleryModel.addPictureItem
			}
		});
	}).call(window);
});