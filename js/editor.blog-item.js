$(function(){
	(function() {
		/* text editor */
		var galleryDescriptionRedactor = $('textarea[data-key="html"]').redactor({
			focus: true,
			linebreaks: true,
			imageUpload: '/api/Image/Upload/',
			fileUpload: '/api/Image/Upload/',
			imageManagerJson: '/api/Image/GetList/',
			plugins: ['imagemanager'],
			changeCallback: function(){
				galleryModel.set({'description': this.code.get()}, {silent: true});
			}
		});

		/* data models */
		var galleryModel = this.galleryModel = new cGalleryEditorModel({
			$dataProvider: $('#blog-edit')
		});
		var gallery = this.gallery = new cGalleryEditor({
			model: galleryModel,
			dom: {
				description: galleryDescriptionRedactor
			},
			render: cBlogEditorRenderer
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